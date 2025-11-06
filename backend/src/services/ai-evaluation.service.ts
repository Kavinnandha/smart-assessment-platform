import axios from 'axios';

// Configuration for LM Studio API
const LM_STUDIO_API_URL = process.env.LM_STUDIO_API_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LM_STUDIO_MODEL = process.env.LM_STUDIO_MODEL || 'oreal-deepseek-r1-distill-qwen-7b';

export interface EvaluationRequest {
  questionText: string;
  correctAnswer: string;
  studentAnswer: string;
  maxMarks: number;
}

export interface EvaluationResponse {
  marksObtained: number;
  feedback: string;
  evaluationDetails: string;
}

/**
 * Evaluates a student's answer using AI (LM Studio local model)
 * @param request - Contains question, correct answer, student answer, and max marks
 * @returns Evaluation result with marks and feedback
 */
export const evaluateAnswerWithAI = async (
  request: EvaluationRequest
): Promise<EvaluationResponse> => {
  try {
    const { questionText, correctAnswer, studentAnswer, maxMarks } = request;

    // Construct the evaluation prompt
    const prompt = `You are an expert teacher evaluating student answers. Your task is to evaluate the student's answer based on content accuracy, completeness, and understanding.

Question: ${questionText}

Model Answer (Staff/Correct Answer): ${correctAnswer}

Student's Answer: ${studentAnswer}

Maximum Marks: ${maxMarks}

Please evaluate the student's answer by comparing it with the model answer. Consider:
1. Content accuracy - Does the answer contain correct information?
2. Completeness - Does it cover all key points from the model answer?
3. Understanding - Does the student demonstrate understanding of the concept?
4. Relevance - Is the answer relevant to the question?

Provide your evaluation in the following JSON format:
{
  "marksObtained": <number between 0 and ${maxMarks}>,
  "feedback": "<brief constructive feedback in 2-3 sentences>",
  "reasoning": "<explanation of why you gave these marks>"
}

Important: Give marks proportionally. If the student answer is partially correct, give partial marks. Be fair and considerate.`;

    // Make API call to LM Studio
    const response = await axios.post<any>(
      LM_STUDIO_API_URL,
      {
        model: LM_STUDIO_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert teacher who evaluates student answers fairly and provides constructive feedback. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent evaluation
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    // Extract the AI response
    const aiResponse = response.data?.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI model');
    }

    // Parse the AI response to extract evaluation
    const evaluation = parseAIResponse(aiResponse, maxMarks);

    return evaluation;
  } catch (error: any) {
    console.error('AI Evaluation Error:', error.message);
    
    // Fallback if AI evaluation fails
    return {
      marksObtained: 0,
      feedback: 'AI evaluation failed. Please evaluate manually.',
      evaluationDetails: `Error: ${error.message}`
    };
  }
};

/**
 * Parses the AI response to extract marks and feedback
 * @param aiResponse - Raw response from AI model
 * @param maxMarks - Maximum marks possible
 * @returns Parsed evaluation response
 */
const parseAIResponse = (aiResponse: string, maxMarks: number): EvaluationResponse => {
  try {
    // Try to find JSON in the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure marks are within valid range
      let marksObtained = Number(parsed.marksObtained) || 0;
      marksObtained = Math.max(0, Math.min(marksObtained, maxMarks));

      return {
        marksObtained,
        feedback: parsed.feedback || 'Evaluation completed.',
        evaluationDetails: parsed.reasoning || 'AI evaluation completed'
      };
    }

    // Fallback: Try to extract marks from text
    const marksMatch = aiResponse.match(/marks[:\s]+(\d+\.?\d*)/i);
    if (marksMatch) {
      let marks = parseFloat(marksMatch[1]);
      marks = Math.max(0, Math.min(marks, maxMarks));
      
      return {
        marksObtained: marks,
        feedback: aiResponse.substring(0, 200),
        evaluationDetails: 'Parsed from AI text response'
      };
    }

    // If parsing fails, return 0 marks
    return {
      marksObtained: 0,
      feedback: 'Unable to parse AI evaluation. Please evaluate manually.',
      evaluationDetails: aiResponse.substring(0, 300)
    };
  } catch (error) {
    console.error('Parse AI Response Error:', error);
    return {
      marksObtained: 0,
      feedback: 'Failed to parse AI response. Please evaluate manually.',
      evaluationDetails: aiResponse.substring(0, 300)
    };
  }
};

/**
 * Batch evaluate multiple answers using AI
 * @param requests - Array of evaluation requests
 * @returns Array of evaluation responses
 */
export const batchEvaluateWithAI = async (
  requests: EvaluationRequest[]
): Promise<EvaluationResponse[]> => {
  // Evaluate each answer sequentially to avoid overwhelming the local model
  const results: EvaluationResponse[] = [];
  
  for (const request of requests) {
    try {
      const result = await evaluateAnswerWithAI(request);
      results.push(result);
      
      // Small delay between requests to avoid overwhelming the local model
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Batch evaluation error:', error);
      results.push({
        marksObtained: 0,
        feedback: 'Evaluation failed',
        evaluationDetails: 'Error during evaluation'
      });
    }
  }
  
  return results;
};
