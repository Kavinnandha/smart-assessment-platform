/**
 * Simple connection test for LM Studio
 * This tests if LM Studio API is accessible without needing database
 * 
 * Usage: npx ts-node src/test-lm-studio-connection.ts
 */

import axios from 'axios';

const LM_STUDIO_API_URL = process.env.LM_STUDIO_API_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LM_STUDIO_MODEL = process.env.LM_STUDIO_MODEL || 'oreal-deepseek-r1-distill-qwen-7b';

async function testLMStudioConnection() {
  console.log('🔌 Testing LM Studio Connection...\n');
  console.log(`API URL: ${LM_STUDIO_API_URL}`);
  console.log(`Model: ${LM_STUDIO_MODEL}\n`);

  try {
    console.log('⏳ Sending test request...\n');

    const response = await axios.post<any>(
      LM_STUDIO_API_URL,
      {
        model: LM_STUDIO_MODEL,
        messages: [
          {
            role: 'user',
            content: 'Hello! Please respond with a simple greeting.'
          }
        ],
        temperature: 0.7,
        max_tokens: 50
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    if (response.data?.choices?.[0]?.message?.content) {
      console.log('✅ SUCCESS! LM Studio is responding correctly.\n');
      console.log('Response from AI:');
      console.log('─'.repeat(60));
      console.log(response.data.choices[0].message.content);
      console.log('─'.repeat(60));
      console.log('\n🎉 Your LM Studio is ready for AI evaluation!');
      
      // Display token usage if available
      if (response.data.usage) {
        console.log('\n📊 Token Usage:');
        console.log(`   Prompt: ${response.data.usage.prompt_tokens}`);
        console.log(`   Completion: ${response.data.usage.completion_tokens}`);
        console.log(`   Total: ${response.data.usage.total_tokens}`);
      }
      
      return true;
    } else {
      console.error('❌ FAILED: Received response but no content');
      console.log('Response structure:', JSON.stringify(response.data, null, 2));
      return false;
    }

  } catch (error: any) {
    console.error('❌ CONNECTION FAILED\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Error: Cannot connect to LM Studio');
      console.log('\n💡 Solutions:');
      console.log('   1. Make sure LM Studio is installed');
      console.log('   2. Open LM Studio application');
      console.log('   3. Go to "Local Server" tab');
      console.log('   4. Load a model (e.g., oreal-deepseek-r1-distill-qwen-7b)');
      console.log('   5. Click "Start Server"');
      console.log('   6. Verify it shows: "Server running on port 1234"');
      console.log('   7. Try this test again');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Error: Request timed out');
      console.log('\n💡 Solutions:');
      console.log('   1. Check if LM Studio server is responding');
      console.log('   2. Try restarting LM Studio');
      console.log('   3. Check if the model is properly loaded');
    } else {
      console.error('Error:', error.message);
      if (error.response) {
        console.log('\nResponse Status:', error.response.status);
        console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    return false;
  }
}

// Also test a simple evaluation scenario
async function testEvaluationScenario() {
  console.log('\n\n🧪 Testing Evaluation Scenario...\n');
  
  try {
    const prompt = `You are an expert teacher evaluating student answers. 

Question: What is 2 + 2?

Model Answer: 4 (four)

Student's Answer: 4

Maximum Marks: 5

Evaluate and respond with JSON:
{
  "marksObtained": <number 0-5>,
  "feedback": "<brief feedback>",
  "reasoning": "<why you gave these marks>"
}`;

    console.log('⏳ Sending evaluation test...\n');

    const response = await axios.post<any>(
      LM_STUDIO_API_URL,
      {
        model: LM_STUDIO_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert teacher. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const aiResponse = response.data?.choices?.[0]?.message?.content;
    
    if (aiResponse) {
      console.log('✅ Evaluation Response Received:\n');
      console.log('─'.repeat(60));
      console.log(aiResponse);
      console.log('─'.repeat(60));
      
      // Try to parse JSON
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('\n✅ Successfully parsed evaluation JSON:');
          console.log(`   Marks: ${parsed.marksObtained}/5`);
          console.log(`   Feedback: ${parsed.feedback}`);
          console.log(`   Reasoning: ${parsed.reasoning}`);
          console.log('\n🎉 AI evaluation is working correctly!');
        } else {
          console.log('\n⚠️  Could not find JSON in response');
          console.log('   But the AI is responding - evaluation may still work');
        }
      } catch (parseError) {
        console.log('\n⚠️  Could not parse JSON from response');
        console.log('   But the AI is responding - evaluation may still work');
      }
    }

  } catch (error: any) {
    console.error('❌ Evaluation test failed:', error.message);
  }
}

// Run both tests
async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        LM Studio Connection & Evaluation Test            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const connectionSuccess = await testLMStudioConnection();
  
  if (connectionSuccess) {
    await testEvaluationScenario();
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n✨ Testing Complete!\n');
  
  if (connectionSuccess) {
    console.log('Next Steps:');
    console.log('1. ✅ LM Studio is ready');
    console.log('2. 📝 Create questions with correct answers in your app');
    console.log('3. 👨‍🎓 Have students submit their test answers');
    console.log('4. 🤖 Use the AI evaluation endpoint to grade submissions');
    console.log('\nAPI Endpoint: PUT /api/submissions/:id/ai-evaluate');
  } else {
    console.log('⚠️  Please fix LM Studio connection before proceeding');
  }
}

runAllTests().catch(console.error);
