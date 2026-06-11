require('dotenv').config();

const mongoose = require('mongoose');
const Question = require('./models/Question');

const connectDB = require('./config/db');

const sampleQuestions = [
  {
    category: 'aptitude',
    question: 'What is 25% of 200?',
    options: ['25', '50', '75', '100'],
    answer: '50'
  },
  {
    category: 'aptitude',
    question: 'If 6 workers complete a task in 8 hours, how long will 4 workers take?',
    options: ['10 hours', '12 hours', '14 hours', '16 hours'],
    answer: '12 hours'
  },
  {
    category: 'aptitude',
    question: 'Which number comes next: 2, 4, 8, 16, ?',
    options: ['24', '32', '48', '64'],
    answer: '32'
  },
  {
    category: 'aptitude',
    question: 'A train travels 60 km in 1 hour. How far in 3 hours?',
    options: ['120 km', '180 km', '200 km', '240 km'],
    answer: '180 km'
  },
  {
    category: 'reasoning',
    question: 'Find the odd one out: Apple, Banana, Carrot, Mango',
    options: ['Apple', 'Banana', 'Carrot', 'Mango'],
    answer: 'Carrot'
  },
  {
    category: 'reasoning',
    question: 'If CAT is coded as DBU, how is DOG coded?',
    options: ['EPH', 'EOG', 'FPH', 'FQH'],
    answer: 'EPH'
  },
  {
    category: 'reasoning',
    question: 'Which word is most similar to "intelligent"?',
    options: ['Dull', 'Bright', 'Slow', 'Weak'],
    answer: 'Bright'
  },
  {
    category: 'reasoning',
    question: 'Complete the series: 5, 10, 15, 20, ?',
    options: ['22', '25', '30', '35'],
    answer: '25'
  }
];

async function seedQuestions() {
  try {
    await connectDB();
    await Question.deleteMany({});
    const questions = await Question.insertMany(sampleQuestions);
    console.log(`Seeded ${questions.length} questions successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed questions:', error.message || error);
    process.exit(1);
  }
}

seedQuestions();
