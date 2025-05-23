
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ParsedCsvData, ColumnInfo } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY environment variable not set. Gemini API calls will fail.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); // Fallback to prevent crash if key is missing, but calls will fail.
const modelName = 'gemini-2.5-flash-preview-04-17';

function formatDataSummaryForPrompt(data: ParsedCsvData): string {
  let summary = `Dataset: ${data.fileName}\n`;
  summary += `Rows: ${data.rowCount}, Columns: ${data.columnCount}\n\n`;
  summary += "Column Details:\n";
  data.columnInfos.forEach(col => {
    summary += `- Name: ${col.name}, Type: ${col.type}\n`;
    summary += `  Missing: ${col.stats.missingCount} (${((col.stats.missingCount / data.rowCount) * 100).toFixed(1)}%)\n`;
    if (col.type === 'number') {
      summary += `  Stats: Mean=${col.stats.mean?.toFixed(2)}, Median=${col.stats.median?.toFixed(2)}, StdDev=${col.stats.stdDev?.toFixed(2)}, Min=${col.stats.min}, Max=${col.stats.max}\n`;
    } else if (col.type === 'string' || col.type === 'boolean') {
      summary += `  Unique Values: ${col.stats.uniqueValues?.length}\n`;
      if (col.stats.valueCounts) {
        const top3 = Object.entries(col.stats.valueCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([val, count]) => `${val} (${count})`)
          .join(', ');
        summary += `  Top Values: ${top3}\n`;
      }
    }
    summary += "\n";
  });

  if (data.sampleRows.length > 0) {
    summary += "Sample Data (first few rows):\n";
    summary += data.headers.join(', ') + '\n';
    data.sampleRows.slice(0,3).forEach(row => { // Only send a few sample rows to keep prompt concise
        summary += data.headers.map(h => row[h]).join(', ') + '\n';
    });
  }
  return summary;
}

export const generateInsights = async (data: ParsedCsvData): Promise<string> => {
  if (!API_KEY) return "Error: API_KEY is not configured. Cannot connect to Gemini.";
  const dataSummary = formatDataSummaryForPrompt(data);
  const prompt = `
Analyze the following dataset summary and provide 3-5 meaningful insights, patterns, or anomalies.
Focus on actionable or interesting observations. Be concise and clear.
If there are obvious data quality issues (e.g., many missing values in a key column), mention them.
Format your response as a list of insights using Markdown.

Dataset Summary:
${dataSummary}

Insights:
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      // No thinkingConfig needed for higher quality insight generation by default
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API error (generateInsights):", error);
    throw new Error(`Gemini API request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const answerQuestion = async (data: ParsedCsvData, question: string): Promise<string> => {
  if (!API_KEY) return "Error: API_KEY is not configured. Cannot connect to Gemini.";
  
  // More concise summary for Q&A to save tokens
  let columnSchema = "Column Schema (Name: Type):\n";
  data.columnInfos.forEach(col => {
    columnSchema += `- ${col.name}: ${col.type}\n`;
  });

  const prompt = `
You are a data analysis assistant. Given the following CSV data schema and a user question, answer the question based ONLY on the provided schema.
Do not make up data or assume external knowledge. If the question cannot be answered from the schema, say so.
If the question implies calculations (e.g., 'average sales'), state that you would need the actual data to compute it, but you can describe how one might approach it based on the column types.

Data Schema:
${columnSchema}

User Question: "${question}"

Answer:
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      // Thinking budget 0 for faster Q&A if low latency is preferred,
      // but for potentially complex questions, default thinking might be better.
      // For this general Q&A, default thinking is likely better.
      // config: { thinkingConfig: { thinkingBudget: 0 } } 
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API error (answerQuestion):", error);
    throw new Error(`Gemini API request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
    