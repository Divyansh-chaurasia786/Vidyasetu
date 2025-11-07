// Game State Variables
let currentGame = '';
let currentQuestionIndex = 0;
let score = 0;
let timer = 60;
let maxQuestions = 10;
let timerInterval;
let typingStartTime;
let typingText = '';
let typingIndex = 0;
let guestUser = null;
let currentUser = { name: "Guest" };
let seenQuestions = {};
let currentDifficulty = 'medium';
let selectedDifficulty = {};
let currentGameQuestions = [];
let spacebarPressed = false;

// Load seen questions from localStorage
function loadSeenQuestions() {
  const seen = localStorage.getItem('vidyasetu_seenQuestions');
  if (seen) {
    seenQuestions = JSON.parse(seen);
  }
}

// Save seen questions to localStorage
function saveSeenQuestions() {
  localStorage.setItem('vidyasetu_seenQuestions', JSON.stringify(seenQuestions));
}

// Mark question as seen
function markQuestionAsSeen(questionId) {
  seenQuestions[questionId] = true;
  saveSeenQuestions();
}

// Get user identifier
function getUserId() {
    if (window.userData && window.userData.id) {
        return window.userData.id;
    } else if (guestUser && guestUser.username) {
        return guestUser.username;
    } else {
        return 'guest_' + (guestUser ? guestUser.name : 'anonymous');
    }
}

// Simple hash function for question uniqueness
function hashQuestion(question) {
  let hash = 0;
  for (let i = 0; i < question.length; i++) {
    const char = question.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Generate questions dynamically
async function generateQuestions(gameType, count = 50, difficulty = 'medium') {

  // First, try to generate questions using the backend API
  try {
    console.log(`[generateQuestions] Attempting API generation for ${gameType} (${difficulty}), count: ${count}`);
    const response = await fetch('/api/generate_questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        game_type: gameType,
        difficulty: difficulty,
        count: count
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.questions && data.questions.length > 0) {
        console.log(`[generateQuestions] API generated ${data.questions.length} questions for ${gameType}`);
        return data.questions;
      }
    }
  } catch (error) {
    console.warn(`[generateQuestions] API call failed for ${gameType}:`, error);
  }

  // Fallback to local generation
  console.log(`[generateQuestions] Falling back to local generation for ${gameType} (${difficulty})`);
  const questions = [];
  const maxAttempts = count * 10; // Prevent infinite loops
  let attempts = 0;

  while (questions.length < count && attempts < maxAttempts) {
    let question;
    switch (gameType) {
      case 'code-quiz':
        question = generateCodeQuizQuestion(difficulty);
        break;
      case 'ai-ml':
        question = generateAIMLQuestion(difficulty);
        break;
      case 'cyber-security':
        question = generateCyberSecurityQuestion(difficulty);
        break;
      case 'data-science':
        question = generateDataScienceQuestion(difficulty);
        break;
      case 'web-dev':
        question = generateWebDevQuestion(difficulty);
        break;
      default:
        question = generateFallbackQuestion();
    }

    if (question) {
      const hash = hashQuestion(question.question);
      question.hash = hash; // Add hash for tracking
      questions.push(question);
    }
    attempts++;
  }

  console.log(`[generateQuestions] Generated ${questions.length} questions for ${gameType}`);
  return questions;
}

// Code Quiz Generator
function generateCodeQuizQuestion(difficulty = 'medium') {
  const templates = {
    easy: [
      {
        type: 'code_snippet',
        questions: [
          {
            language: 'Python',
            code: 'x = 5\ny = 10\nprint(x + y)',
            question: 'What is the output of this Python code?',
            correct: '15',
            wrongs: ['5', '10', 'Error']
          },
          {
            language: 'JavaScript',
            code: 'let name = "John";\nconsole.log(`Hello, ${name}!`);',
            question: 'What will be logged to the console?',
            correct: 'Hello, John!',
            wrongs: ['Hello, name!', 'Hello, ${name}!', 'Error']
          },
          {
            language: 'Java',
            code: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}',
            question: 'What is the output of this Java code?',
            correct: 'Hello, World!',
            wrongs: ['"Hello, World!"', 'Error', 'No output']
          }
        ]
      }
    ],
    medium: [
      {
        type: 'code_snippet',
        questions: [
          {
            language: 'Python',
            code: 'def factorial(n):\n  if n == 0:\n    return 1\n  else:\n    return n * factorial(n-1)\nprint(factorial(5))',
            question: 'What is the output of this Python code?',
            correct: '120',
            wrongs: ['24', 'Error', 'Infinite loop']
          },
          {
            language: 'JavaScript',
            code: 'const numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(num => num * 2);\nconsole.log(doubled);',
            question: 'What will be logged to the console?',
            correct: '[2, 4, 6, 8, 10]',
            wrongs: ['[1, 2, 3, 4, 5]', '[1, 4, 9, 16, 25]', 'Error']
          },
          {
            language: 'Java',
            code: 'import java.util.ArrayList;\npublic class Main {\n  public static void main(String[] args) {\n    ArrayList<String> cars = new ArrayList<String>();\n    cars.add("Volvo");\n    cars.add("BMW");\n    cars.add("Ford");\n    System.out.println(cars.get(1));\n  }\n}',
            question: 'What is the output of this Java code?',
            correct: 'BMW',
            wrongs: ['Volvo', 'Ford', 'Error']
          }
        ]
      }
    ],
    hard: [
      {
        type: 'code_snippet',
        questions: [
          {
            language: 'Python',
            code: 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)',
            question: 'What is the output of this Python code?',
            correct: '[1, 2, 3, 4]',
            wrongs: ['[1, 2, 3]', '[4]', 'Error']
          },
          {
            language: 'JavaScript',
            code: 'console.log(0.1 + 0.2 === 0.3);',
            question: 'What will be logged to the console?',
            correct: 'false',
            wrongs: ['true', 'Error', 'undefined']
          },
          {
            language: 'Java',
            code: 'try {\n  int[] myNumbers = {1, 2, 3};\n  System.out.println(myNumbers[10]);\n} catch (Exception e) {\n  System.out.println("Something went wrong.");\n}',
            question: 'What is the output of this Java code?',
            correct: 'Something went wrong.',
            wrongs: ['10', '3', 'Error']
          }
        ]
      }
    ]
  };

  const difficultyTemplates = templates[difficulty] || templates.medium;
  const category = difficultyTemplates[Math.floor(Math.random() * difficultyTemplates.length)];
  const qTemplate = category.questions[Math.floor(Math.random() * category.questions.length)];

  if (category.type === 'code_snippet') {
    const options = [qTemplate.correct, ...qTemplate.wrongs].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(qTemplate.correct);
    return {
      question: `${qTemplate.question}\n\n` + '```' + `${qTemplate.language.toLowerCase()}
${qTemplate.code}
` + '```',
      options,
      correct: correctIndex
    };
  }

  if (qTemplate.generate) {
    return qTemplate.generate();
  }

  // For static questions, format them properly
  const options = [qTemplate.correct, ...qTemplate.wrongs].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(qTemplate.correct);

  return {
    question: qTemplate.template,
    options,
    correct: correctIndex
  };
}



// AI/ML Generator
function generateAIMLQuestion(difficulty = 'medium') {
  const templates = {
    easy: [
      {
        template: "What is the primary goal of unsupervised learning?",
        correct: "To find hidden patterns in unlabeled data",
        wrongs: ["To make predictions based on labeled data", "To learn from a reward system", "To classify data into predefined categories"]
      },
      {
        template: "Which of these is a common application of natural language processing (NLP)?",
        correct: "Sentiment analysis",
        wrongs: ["Image recognition", "Stock price prediction", "Self-driving cars"]
      },
      {
        template: "What does a CPU primarily do in a computer?",
        correct: "Execute instructions",
        wrongs: ["Store data long-term", "Render graphics", "Manage network connections"]
      }
    ],
    medium: [
      {
        template: "What is the main difference between a list and a tuple in Python?",
        correct: "Lists are mutable, while tuples are immutable",
        wrongs: ["Tuples can only store integers", "Lists are faster than tuples", "There is no difference"]
      },
      {
        template: "In machine learning, what is 'overfitting'?",
        correct: "A model that performs well on training data but poorly on new data",
        wrongs: ["A model that is too simple", "A model that has not been trained enough", "A model that is perfect"]
      },
      {
        template: "What is the purpose of a firewall in network security?",
        correct: "To monitor and control incoming and outgoing network traffic",
        wrongs: ["To speed up internet connection", "To store passwords securely", "To create backups of data"]
      }
    ],
    hard: [
      {
        template: "What is the difference between 'shallow copy' and 'deep copy' of an object in Python?",
        correct: "A shallow copy creates a new object but references the original nested objects, while a deep copy creates a fully independent copy.",
        wrongs: ["A deep copy is faster than a shallow copy", "A shallow copy is only for lists", "There is no difference"]
      },
      {
        template: "What is the halting problem in computer science?",
        correct: "The problem of determining, from a description of an arbitrary computer program and an input, whether the program will finish running or continue to run forever.",
        wrongs: ["The problem of a computer program crashing", "The problem of a computer running out of memory", "The problem of a computer being too slow"]
      },
      {
        template: "What is a quantum bit (qubit)?",
        correct: "A unit of quantum information that can exist in a superposition of both 0 and 1.",
        wrongs: ["A very small classical bit", "A bit that is resistant to errors", "A bit that can store three values"]
      }
    ]
  };

  const difficultyTemplates = templates[difficulty] || templates.medium;
  const template = difficultyTemplates[Math.floor(Math.random() * difficultyTemplates.length)];
  const options = [template.correct, ...template.wrongs].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(template.correct);

  return {
    question: template.template,
    options,
    correct: correctIndex
  };
}

// Cyber Security Generator
function generateCyberSecurityQuestion(difficulty = 'medium') {
  const templates = {
    easy: [
      {
        template: "What is phishing?",
        correct: "A type of social engineering attack used to steal user data",
        wrongs: ["A type of computer virus", "A method for securing a network", "A type of hardware"]
      },
      {
        template: "What is a strong password?",
        correct: "A password that is long and contains a mix of uppercase and lowercase letters, numbers, and symbols",
        wrongs: ["A password that is easy to remember, like 'password123'", "A password that is the name of your pet", "A password that is your birthday"]
      }
    ],
    medium: [
      {
        template: "What is a DDoS attack?",
        correct: "An attack that attempts to make an online service unavailable by overwhelming it with traffic from multiple sources",
        wrongs: ["An attack that steals a user's personal information", "An attack that encrypts a user's files and demands a ransom", "An attack that installs malware on a user's computer"]
      },
      {
        template: "What is two-factor authentication (2FA)?",
        correct: "A security process where users provide two different authentication factors to verify themselves",
        wrongs: ["A type of password that is twice as long as a normal password", "A security question that you have to answer in addition to your password", "A type of firewall"]
      }
    ],
    hard: [
      {
        template: "What is a zero-day exploit?",
        correct: "An attack that targets a previously unknown vulnerability in a software application",
        wrongs: ["An attack that occurs on the first day a new software is released", "An attack that uses a virus that has not been seen before", "An attack that is carried out by a government agency"]
      },
      {
        template: "What is the principle of least privilege?",
        correct: "The principle that a user should only have the minimum level of access necessary to perform their job functions",
        wrongs: ["The principle that a user should have access to all the files on a network", "The principle that a user should be able to install any software they want on their computer", "The principle that a user should be able to change their own password at any time"]
      }
    ]
  };

  const difficultyTemplates = templates[difficulty] || templates.medium;
  const template = difficultyTemplates[Math.floor(Math.random() * difficultyTemplates.length)];
  const options = [template.correct, ...template.wrongs].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(template.correct);

  return {
    question: template.template,
    options,
    correct: correctIndex
  };
}

// Data Science Generator
function generateDataScienceQuestion(difficulty = 'medium') {
  const templates = {
    easy: [
      {
        template: "What is the mean of the following numbers: 2, 4, 6, 8?",
        correct: "5",
        wrongs: ["4", "6", "8"]
      },
      {
        template: "What is the median of the following numbers: 1, 2, 3, 4, 5?",
        correct: "3",
        wrongs: ["1", "2", "4"]
      }
    ],
    medium: [
      {
        template: "What is the difference between supervised and unsupervised learning?",
        correct: "Supervised learning uses labeled data, while unsupervised learning uses unlabeled data",
        wrongs: ["Supervised learning is used for classification, while unsupervised learning is used for regression", "Supervised learning is more accurate than unsupervised learning", "There is no difference between supervised and unsupervised learning"]
      },
      {
        template: "What is a confusion matrix?",
        correct: "A table that is used to evaluate the performance of a classification model",
        wrongs: ["A table that is used to visualize data", "A table that is used to store data", "A table that is used to clean data"]
      }
    ],
    hard: [
      {
        template: "What is the bias-variance tradeoff?",
        correct: "The tradeoff between a model's ability to fit the training data and its ability to generalize to new data",
        wrongs: ["The tradeoff between the speed and accuracy of a model", "The tradeoff between the size and complexity of a model", "The tradeoff between the number of features and the number of samples in a dataset"]
      },
      {
        template: "What is a p-value?",
        correct: "The probability of obtaining a result at least as extreme as the one that was actually observed, assuming that the null hypothesis is true",
        wrongs: ["The probability that the null hypothesis is true", "The probability that the alternative hypothesis is true", "The probability of making a Type I error"]
      }
    ]
  };

  const difficultyTemplates = templates[difficulty] || templates.medium;
  const template = difficultyTemplates[Math.floor(Math.random() * difficultyTemplates.length)];
  const options = [template.correct, ...template.wrongs].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(template.correct);

  return {
    question: template.template,
    options,
    correct: correctIndex
  };
}

// Web Dev Generator
function generateWebDevQuestion(difficulty = 'medium') {
  const templates = {
    easy: [
      {
        template: "What does HTML stand for?",
        correct: "Hypertext Markup Language",
        wrongs: ["Hyperlinks and Text Markup Language", "Home Tool Markup Language", "Hyper-Text-Markup-Language"]
      },
      {
        template: "What does CSS stand for?",
        correct: "Cascading Style Sheets",
        wrongs: ["Creative Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"]
      }
    ],
    medium: [
      {
        template: "What is the difference between '==' and '===' in JavaScript?",
        correct: "'==' compares the values of two variables, while '===' compares both the values and the types of two variables",
        wrongs: ["'==' is used for assignment, while '===' is used for comparison", "'==' is a syntax error", "There is no difference between '==' and '==='. "]
      },
      {
        template: "What is a responsive web design?",
        correct: "A web design that adjusts to the screen size of the device it is being viewed on",
        wrongs: ["A web design that is very fast", "A web design that is very colorful", "A web design that is very simple"]
      }
    ],
    hard: [
      {
        template: "What is a closure in JavaScript?",
        correct: "A function that has access to the variables in its outer (enclosing) function's scope chain",
        wrongs: ["A function that is closed and cannot be called", "A function that has no access to variables outside of its own scope", "A function that can only be called once"]
      },
      {
        template: "What is the event loop in JavaScript?",
        correct: "A mechanism that allows JavaScript to perform non-blocking operations",
        wrongs: ["A loop that iterates through all the events on a web page", "A loop that is used to create animations", "A loop that is used to handle user input"]
      }
    ]
  };

  const difficultyTemplates = templates[difficulty] || templates.medium;
  const template = difficultyTemplates[Math.floor(Math.random() * difficultyTemplates.length)];
  const options = [template.correct, ...template.wrongs].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(template.correct);

  return {
    question: template.template,
    options,
    correct: correctIndex
  };
}

// Fallback Generator
function generateFallbackQuestion() {
  const questions = [
    {
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correct: 1
    }
  ];

  return questions[Math.floor(Math.random() * questions.length)];
}

// Base phrases for generating dynamic typing texts
const basePhrases = {
  easy: [
    "The quick brown fox jumps over the lazy dog.",
    "Hello world! Welcome to programming.",
    "Python is fun and easy to learn.",
    "I love coding and building applications.",
    "Machine learning is amazing technology.",
    "Data science rocks and changes lives.",
    "Web development is cool and creative.",
    "Artificial intelligence is the future.",
    "Cloud computing is powerful and scalable.",
    "Big data analytics drives insights.",
    "Cybersecurity matters for protection.",
    "Blockchain technology offers security.",
    "Internet of Things connects devices.",
    "Virtual reality creates immersive worlds.",
    "Augmented reality enhances reality.",
    "Quantum computing solves complex problems.",
    "Neural networks mimic brain function.",
    "Deep learning discovers patterns.",
    "Natural language processing understands text.",
    "Computer vision sees and interprets.",
    "Reinforcement learning learns through interaction.",
    "Supervised learning uses labeled data.",
    "Unsupervised learning finds hidden patterns.",
    "Regression analysis predicts values.",
    "Classification models categorize data.",
    "Clustering algorithms group similar items.",
    "Dimensionality reduction simplifies data.",
    "Ensemble methods combine predictions.",
    "Gradient boosting improves accuracy.",
    "Random forests build decision trees.",
    "Support vector machines separate classes.",
    "K-nearest neighbors find similarities.",
    "Naive Bayes uses probability.",
    "Decision trees make choices.",
    "Linear regression finds relationships.",
    "Logistic regression predicts categories.",
    "K-means clustering finds centers.",
    "Principal component analysis reduces features.",
    "T-SNE visualizes high dimensions.",
    "Autoencoders compress and reconstruct.",
    "Convolutional neural networks process images.",
    "Recurrent neural networks handle sequences.",
    "Long short-term memory remembers context.",
    "Gated recurrent units simplify memory.",
    "Transformers revolutionize language tasks.",
    "Attention mechanisms focus on relevance.",
    "Backpropagation trains neural networks.",
    "Activation functions add non-linearity.",
    "Loss functions measure errors.",
    "Optimizers improve performance.",
    "Batch normalization stabilizes training.",
    "Dropout prevents overfitting.",
    "Weight initialization sets starting values.",
    "Neural network architectures define structure.",
    "Feedforward networks pass information.",
    "Generative adversarial networks create content.",
    "Tokenization breaks text into pieces.",
    "Stemming reduces words to roots.",
    "Lemmatization finds base forms.",
    "Part-of-speech tagging labels words.",
    "Named entity recognition finds names.",
    "Sentiment analysis detects emotions.",
    "Text classification sorts documents.",
    "Language models predict text.",
    "Word embeddings represent meaning.",
    "BERT understands context deeply.",
    "GPT generates human-like text.",
    "Sequence-to-sequence models transform sequences.",
    "Machine translation converts languages.",
    "Question answering provides answers.",
    "Text summarization condenses information.",
    "Chatbots converse naturally.",
    "Speech recognition converts sound to text.",
    "Text-to-speech creates audio from text.",
    "Language generation creates new content.",
    "Image classification identifies objects.",
    "Object detection locates items.",
    "Image segmentation divides regions.",
    "Facial recognition identifies people.",
    "Optical character recognition reads text.",
    "Image preprocessing prepares data.",
    "Convolutional layers extract features.",
    "Pooling layers reduce dimensions.",
    "Feature extraction finds characteristics.",
    "Transfer learning reuses knowledge.",
    "Data augmentation increases variety.",
    "Image generation creates visuals.",
    "Style transfer changes appearance.",
    "Pose estimation finds positions.",
    "Scene understanding comprehends environments.",
    "Video analysis processes motion.",
    "Depth estimation measures distance.",
    "Image super-resolution enhances quality.",
    "Markov decision processes model choices.",
    "Q-learning learns optimal actions.",
    "Policy gradients optimize behavior.",
    "Actor-critic methods combine approaches.",
    "Deep reinforcement learning uses neural networks.",
    "Exploration balances trying new things.",
    "Reward functions guide learning.",
    "Value functions estimate worth.",
    "Temporal difference learning updates knowledge.",
    "Monte Carlo methods use complete experiences.",
    "Multi-armed bandits solve exploration problems.",
    "Game theory studies strategic decisions.",
    "Inverse reinforcement learning learns from experts.",
    "Hierarchical RL breaks down complex tasks.",
    "Model-based RL plans ahead.",
    "Off-policy learning uses different experiences.",
    "On-policy learning follows current strategy.",
    "Data preprocessing cleans information.",
    "Feature engineering creates useful variables.",
    "Data visualization shows patterns.",
    "Statistical analysis finds meaning.",
    "Hypothesis testing validates claims.",
    "A/B testing compares options.",
    "Time series analysis studies trends.",
    "Anomaly detection finds outliers.",
    "Big data handles large volumes.",
    "Data mining discovers knowledge.",
    "Predictive modeling forecasts outcomes.",
    "Causal inference finds cause and effect.",
    "Experimental design plans studies.",
    "Sampling techniques select data.",
    "Data ethics ensures responsible use.",
    "Bias in data causes unfair results.",
    "Data privacy protects information.",
    "GDPR compliance meets regulations.",
    "TensorFlow builds machine learning models.",
    "PyTorch offers dynamic computation.",
    "Keras simplifies neural networks.",
    "Scikit-learn provides algorithms.",
    "Pandas manipulates data easily.",
    "NumPy supports numerical operations.",
    "Matplotlib creates visualizations.",
    "Seaborn builds statistical graphics.",
    "Jupyter notebooks enable interactive work.",
    "Google Colab provides cloud computing.",
    "AWS SageMaker simplifies workflows.",
    "Model deployment makes models available.",
    "MLOps manages machine learning lifecycle.",
    "Model versioning tracks changes.",
    "Hyperparameter tuning optimizes settings.",
    "Cross-validation assesses performance.",
    "Grid search finds best parameters.",
    "Random search explores efficiently.",
    "Algorithmic bias creates unfair systems.",
    "Fairness in AI ensures equity.",
    "Explainable AI makes decisions clear.",
    "Privacy-preserving ML protects data.",
    "Adversarial attacks test robustness.",
    "Robustness ensures reliable performance.",
    "AI safety prevents harmful outcomes.",
    "Responsible AI considers societal impact."
  ],
  medium: [
    "Machine learning algorithms can be broadly classified into supervised, unsupervised, and reinforcement learning categories, each with distinct approaches to data analysis and pattern recognition.",
    "Data science involves extracting insights from structured and unstructured data using statistical methods, programming languages, and domain expertise to drive informed decision-making processes.",
    "Web development encompasses front-end technologies like HTML, CSS, and JavaScript for user interfaces, as well as back-end frameworks such as Node.js, Django, or Flask for server-side logic and database interactions.",
    "Artificial intelligence systems are designed to perform tasks that typically require human intelligence, such as visual perception, speech recognition, decision-making, and language translation, often using complex algorithms and large datasets.",
    "Cloud computing provides scalable resources over the internet, enabling businesses to deploy applications without managing physical infrastructure, with services like Amazon Web Services, Microsoft Azure, and Google Cloud Platform offering various computing, storage, and networking capabilities.",
    "Big data analytics helps organizations process and analyze vast amounts of information to uncover patterns, trends, and insights, utilizing technologies like Hadoop, Spark, and NoSQL databases for distributed computing and storage solutions.",
    "Cybersecurity professionals work to protect digital systems from threats like malware, phishing, ransomware, and unauthorized access, employing techniques such as encryption, multi-factor authentication, and intrusion detection systems to maintain system integrity.",
    "Blockchain technology offers decentralized and secure ways to record transactions across multiple parties without intermediaries, using cryptographic methods and distributed consensus mechanisms like proof-of-work or proof-of-stake to ensure data immutability."
  ]
};

// Prompt for User Info (for guests)
async function promptForUserInfo() {
  return new Promise((resolve) => {
    // Create modal for guest user input
    const modal = document.createElement('div');
    modal.className = 'guest-modal';
    modal.innerHTML = `
      <div class="guest-modal-content">
        <span id="guest-close" class="close-btn">&times;</span>
        <h3>Welcome Guest!</h3>
        <p>Please enter your name to play:</p>
        <input type="text" id="guest-name" placeholder="Your Name" maxlength="50">
        <input type="text" id="guest-username" placeholder="Username (optional)" maxlength="30">
        <div id="username-error" class="error-message" style="display: none;"></div>
        <div class="guest-modal-buttons">
          <button id="guest-submit">Start Playing</button>
        </div>
      </div>
    `;

    // Style the modal (Arcade Theme)
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Courier New', monospace;
    `;

    const modalContent = modal.querySelector('.guest-modal-content');
    modalContent.style.cssText = `
      background: linear-gradient(135deg, #1a1a1a, #333);
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1);
      border: 2px solid #00ff00;
      max-width: 400px;
      width: 90%;
      text-align: center;
      color: #00ff00;
      position: relative;
    `;

    const closeBtn = modal.querySelector('#guest-close');
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      color: #00ff00;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
      transition: color 0.3s;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#ffffff';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#00ff00';
    });

    const inputs = modal.querySelectorAll('input');
    inputs.forEach(input => {
      input.style.cssText = `
        width: 100%;
        padding: 12px;
        margin: 10px 0;
        border: 2px solid #00ff00;
        border-radius: 5px;
        background: #000;
        color: #00ff00;
        font-size: 16px;
        font-family: 'Courier New', monospace;
        box-sizing: border-box;
        outline: none;
      `;
      input.addEventListener('focus', () => {
        input.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.8)';
      });
      input.addEventListener('blur', () => {
        input.style.boxShadow = 'none';
      });
    });

    const buttons = modal.querySelectorAll('button');
    buttons.forEach(button => {
      button.style.cssText = `
        padding: 12px 24px;
        margin: 10px;
        border: 2px solid #00ff00;
        border-radius: 5px;
        background: #000;
        color: #00ff00;
        cursor: pointer;
        font-size: 16px;
        font-family: 'Courier New', monospace;
        transition: all 0.3s;
      `;
      button.addEventListener('mouseenter', () => {
        button.style.background = '#00ff00';
        button.style.color = '#000';
        button.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.8)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.background = '#000';
        button.style.color = '#00ff00';
        button.style.boxShadow = 'none';
      });
    });

    document.body.appendChild(modal);

    const nameInput = modal.querySelector('#guest-name');
    const usernameInput = modal.querySelector('#guest-username');
    const errorDiv = modal.querySelector('#username-error');
    const submitBtn = modal.querySelector('#guest-submit');

    // Focus on name input
    nameInput.focus();

    // Handle submit
    const handleSubmission = async () => {
      const name = nameInput.value.trim();
      const username = usernameInput.value.trim();

      if (!name) {
        errorDiv.textContent = 'Please enter your name.';
        errorDiv.style.display = 'block';
        return;
      }

      // Check username availability only if username is provided
      if (username) {
        const checkResult = await checkUsername(username);
        if (!checkResult.available) {
          errorDiv.textContent = checkResult.message;
          errorDiv.style.display = 'block';
          return;
        }
      }

      // Success
      currentUser.name = name;
      guestUser = { name, username };
      const greetingDiv = document.getElementById('user-greeting');
      const userNameSpan = document.getElementById('user-name');
      if (greetingDiv && userNameSpan) {
        userNameSpan.textContent = name;
        greetingDiv.style.display = 'block';
      }
      modal.remove();
      resolve({ name, username });
    };

    submitBtn.addEventListener('click', handleSubmission);

    // Handle close
    closeBtn.addEventListener('click', () => {
      modal.remove();
      resolve(null);
    });
  });
}

// Update difficulty display in modal
function updateDifficultyDisplay(gameType, difficulty) {
    const difficultySpan = document.getElementById(`${gameType}-difficulty`);
    if (difficultySpan) {
        difficultySpan.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    }
}

// Start game function
async function startGame(gameType, difficulty) {
    console.log('startGame called with:', gameType, difficulty);
    currentGame = gameType;
    score = 0;
    currentQuestionIndex = 0;
    const userId = getUserId();

    console.log(`Starting game: ${gameType} (${difficulty}) for user: ${userId}`);

    // Update difficulty display in modal
    updateDifficultyDisplay(gameType, difficulty);

    // Generate questions
    try {
        const allQuestions = await generateQuestions(gameType, 50, difficulty);
        console.log(`Generated ${allQuestions.length} questions`);

        // Filter out seen questions
        const unseenQuestions = allQuestions.filter(q => !seenQuestions[q.hash]);
        console.log(`Found ${unseenQuestions.length} unseen questions`);

        if (unseenQuestions.length === 0) {
            console.log("You've answered all questions! Resetting...");
            // Clear seen questions for this game type
            const userGameKey = `${userId}_${gameType}`;
            Object.keys(seenQuestions).forEach(key => {
                if (key.startsWith(userGameKey)) {
                    delete seenQuestions[key];
                }
            });
            saveSeenQuestions();

            // Generate fresh questions
            const freshQuestions = await generateQuestions(gameType, maxQuestions, difficulty);
            currentGameQuestions = freshQuestions.slice(0, maxQuestions);
        } else {
            // Shuffle and take maxQuestions
            const shuffled = unseenQuestions.sort(() => Math.random() - 0.5);
            currentGameQuestions = shuffled.slice(0, maxQuestions);
        }

        console.log(`Starting game with ${currentGameQuestions.length} questions`);
        displayNextQuestion();
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Error starting game. Please try again.');
    }
}

// Display next question
function displayNextQuestion() {
    if (currentQuestionIndex < currentGameQuestions.length) {
        const question = currentGameQuestions[currentQuestionIndex];

        // Mark question as seen
        markQuestionAsSeen(question.hash);

        const modal = document.querySelector('.game-modal.show');
        if (!modal) {
            console.error('No modal found');
            return;
        }

        // Get the correct selectors based on game type
        let questionText, optionsContainer;
        switch (currentGame) {
            case 'code-quiz':
                questionText = modal.querySelector('#code-quiz-question-text');
                optionsContainer = modal.querySelector('#code-quiz-options');
                break;
            case 'ai-ml':
                questionText = modal.querySelector('#ai-ml-question-text');
                optionsContainer = modal.querySelector('#ai-ml-options');
                break;
            case 'cyber-security':
                questionText = modal.querySelector('#cyber-security-question-text');
                optionsContainer = modal.querySelector('#cyber-security-options');
                break;
            case 'data-science':
                questionText = modal.querySelector('#data-science-question-text');
                optionsContainer = modal.querySelector('#data-science-options');
                break;
            case 'web-dev':
                questionText = modal.querySelector('#web-dev-question-text');
                optionsContainer = modal.querySelector('#web-dev-options');
                break;
            default:
                console.error('Unknown game type:', currentGame);
                return;
        }

        if (!questionText || !optionsContainer) {
            console.error('Question elements not found for game:', currentGame);
            return;
        }

        // Format question to render code blocks
        let formattedQuestion = question.question.replace(/```(\w+)?\n([\s\S]+?)\n```/g, '<pre><code>$2</code></pre>');
        questionText.innerHTML = formattedQuestion;

        optionsContainer.innerHTML = '';

        question.options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.classList.add('option-btn');
            button.addEventListener('click', () => submitAnswer(option));
            optionsContainer.appendChild(button);
        });
    } else {
        endGame();
    }
}

// Submit answer
function submitAnswer(selectedOption) {
    const question = currentGameQuestions[currentQuestionIndex];
    if (selectedOption === question.options[question.correct]) {
        score++;
    }
    currentQuestionIndex++;
    displayNextQuestion();
}

// End game
function endGame() {
    const modal = document.querySelector('.game-modal.show');
    if (!modal) return;

    // Hide question content and show final score
    const quizContent = modal.querySelector('.game-question');
    const resultDiv = modal.querySelector('.game-result');

    if (quizContent) quizContent.style.display = 'none';
    if (resultDiv) {
        resultDiv.style.display = 'block';
        const scoreElement = resultDiv.querySelector('#final-score') ||
                           resultDiv.querySelector('p') ||
                           resultDiv;
        if (scoreElement) {
            scoreElement.innerHTML = `<h3>Game Over!</h3><p>Your Score: ${score}/${currentGameQuestions.length}</p>`;
        }
    }

    // Save score to backend
    saveScoreToBackend(currentGame, score, currentUser.name, getUserId());
}

// Save score to backend
async function saveScoreToBackend(gameType, score, name, username) {
    try {
        const response = await fetch('/api/save_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                game_type: gameType,
                score: score,
                name: name,
                username: username
            })
        });

        if (response.ok) {
            console.log('Score saved successfully');
        } else {
            console.error('Failed to save score');
        }
    } catch (error) {
        console.error('Error saving score:', error);
    }
}

async function getTypingText(difficulty = 'medium') {
    const difficultyPhrases = basePhrases[difficulty] || basePhrases.medium;
    return difficultyPhrases[Math.floor(Math.random() * difficultyPhrases.length)];
}

async function loadNextTypingText(difficulty) {
    typingText = await getTypingText(difficulty);
    const textElement = document.getElementById('typing-text');
    const inputElement = document.getElementById('typing-input');
    if (textElement) textElement.textContent = typingText;
    if (inputElement) {
        inputElement.value = '';
        spacebarPressed = false;
    }
}

// Start typing game
async function startTypingGame(difficulty) {
    console.log('startTypingGame called');
    updateDifficultyDisplay('speed-typing', difficulty);
    spacebarPressed = false;
    await loadNextTypingText(difficulty);
    typingIndex = 0;
    typingStartTime = Date.now();

    const modal = document.getElementById('speed-typing-modal');
    const inputElement = modal.querySelector('#typing-input');

    if (inputElement) {
        inputElement.focus();
    }

    // Start timer
    timer = 60;
    const timerElement = modal.querySelector('#typing-timer');
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timer--;
        if (timerElement) timerElement.textContent = timer;
        if (timer <= 0) {
            clearInterval(timerInterval);
            endTypingGame();
        }
    }, 1000);

    // Handle typing input
    inputElement.addEventListener('input', handleTypingInput);
}

// Handle typing input
function handleTypingInput(e) {
    const input = e.target.value;
    const textElement = document.getElementById('typing-text');
    let renderedText = '';
    let correct = true;
    for (let i = 0; i < typingText.length; i++) {
        if (i < input.length) {
            if (input[i] === typingText[i]) {
                renderedText += `<span class="correct">${typingText[i]}</span>`;
            } else {
                renderedText += `<span class="incorrect">${typingText[i]}</span>`;
                correct = false;
            }
        } else {
            renderedText += `<span>${typingText[i]}</span>`;
            correct = false;
        }
    }
    textElement.innerHTML = renderedText;

    if (correct) {
        loadNextTypingText(selectedDifficulty['speed-typing']);
    }

    // Update WPM and accuracy
    const timeElapsed = (Date.now() - typingStartTime) / 1000 / 60; // in minutes
    const wpm = Math.round(((input.length / 5) / timeElapsed));
    const accuracy = Math.round((input.length / typingText.length) * 100);

    const modal = document.getElementById('speed-typing-modal');
    const wpmElement = modal.querySelector('#typing-wpm');
    const accuracyElement = modal.querySelector('#typing-accuracy');

    if (wpmElement) wpmElement.textContent = wpm || 0;
    if (accuracyElement) accuracyElement.textContent = accuracy || 100;
}

// End typing game
function endTypingGame() {
    if (timerInterval) clearInterval(timerInterval);

    const inputElement = document.getElementById('typing-input');
    const timeElapsed = (Date.now() - typingStartTime) / 1000 / 60; // in minutes
    const wpm = Math.round(((inputElement.value.length / 5) / timeElapsed));
    const accuracy = Math.round((inputElement.value.length / typingText.length) * 100);

    const modal = document.getElementById('speed-typing-modal');
    const resultDiv = modal.querySelector('#speed-typing-result');

    if (resultDiv) {
        resultDiv.style.display = 'block';
        const finalWpm = resultDiv.querySelector('#final-wpm');
        const finalAccuracy = resultDiv.querySelector('#final-accuracy');
        const finalScore = resultDiv.querySelector('#final-typing-score');

        if (finalWpm) finalWpm.textContent = wpm;
        if (finalAccuracy) finalAccuracy.textContent = accuracy;
        if (finalScore) finalScore.textContent = wpm; // Score is WPM for typing game
    }

    // Save score
    saveScoreToBackend('speed-typing', wpm, currentUser.name, getUserId());
}

// Initialize game page
function initGamePage() {
  loadSeenQuestions();
  if (!window.userData) {
    promptForUserInfo();
  }
}

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  const typingInput = document.getElementById('typing-input');
  if(typingInput) {
    typingInput.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            spacebarPressed = true;
        }
        if (spacebarPressed && e.key === 'Backspace') {
            e.preventDefault();
        }
    });
  }

  // Attempt to autoplay music
  const bgMusic = document.getElementById("bg-music");
  if (bgMusic) {
    bgMusic.play().catch(error => {
      console.log("Autoplay blocked by browser. Music will play on first user interaction.");
      // Play music on first user interaction
      const playMusicOnInteraction = () => {
        bgMusic.play().then(() => {
          document.removeEventListener('click', playMusicOnInteraction);
          document.removeEventListener('keydown', playMusicOnInteraction);
          document.removeEventListener('touchstart', playMusicOnInteraction);
        }).catch(err => console.log("Still blocked:", err));
      };
      document.addEventListener('click', playMusicOnInteraction);
      document.addEventListener('keydown', playMusicOnInteraction);
      document.addEventListener('touchstart', playMusicOnInteraction);
    });
  }

  // Show user greeting if logged in
  if (window.userData) {
    const greetingDiv = document.getElementById('user-greeting');
    const userNameSpan = document.getElementById('user-name');
    if (greetingDiv && userNameSpan) {
      userNameSpan.textContent = window.userData.full_name || window.userData.username;
      greetingDiv.style.display = 'block';
    }
  }

  // Fade-in animation
  const elements = document.querySelectorAll('.navbar, .hero, .game-machines, .leaderboard');
  elements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, index * 200);
  });

  // Set default difficulty
  const machines = document.querySelectorAll('.machine');
  machines.forEach(machine => {
    const mediumLevel = machine.querySelector('.level.medium');
    if (mediumLevel) {
      mediumLevel.classList.add('selected');
    }

    const gameTitle = machine.querySelector('h3').textContent;
    let gameType = '';
    switch (gameTitle) {
      case 'Code Quiz':
        gameType = 'code-quiz';
        break;
      case 'AI/ML Game':
        gameType = 'ai-ml';
        break;
      case 'Speed Typing':
        gameType = 'speed-typing';
        break;
      case 'Cyber Security':
        gameType = 'cyber-security';
        break;
      case 'Data Science':
        gameType = 'data-science';
        break;
      case 'Web Dev Challenge':
        gameType = 'web-dev';
        break;
    }
    if (gameType) {
      selectedDifficulty[gameType] = 'medium';
    }
  });

  initGamePage();
  loadLeaderboard();
});

// Back button
const backButton = document.getElementById("back-button");
if (backButton) {
  backButton.addEventListener("click", () => {
    console.log('Back button clicked');
    window.history.back();
  });
}

// Music control
const musicBtn = document.getElementById("music-btn");
if (musicBtn) {
  musicBtn.addEventListener("click", () => {
    console.log('Music button clicked');
    const bgMusic = document.getElementById("bg-music");
    if (bgMusic && bgMusic.paused) {
      bgMusic.play().then(() => {
        bgMusic.muted = false;
        musicBtn.innerHTML = "🔊 Music";
      }).catch(error => {
        console.log("Playback failed:", error);
      });
    } else if (bgMusic) {
      bgMusic.muted = !bgMusic.muted;
      musicBtn.innerHTML = bgMusic.muted ? "🔇 Muted" : "🔊 Music";
    }
  });
}

// Arcade buttons
const arcadeBtns = document.querySelectorAll(".arcade-btn");
arcadeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    console.log('Arcade button clicked');
    if (btn.textContent.includes("Start Game")) {
      const gamesSection = document.querySelector('.game-machines');
      if (gamesSection) gamesSection.scrollIntoView({ behavior: 'smooth' });
    } else if (btn.textContent.includes("High Scores")) {
      const leaderboardSection = document.querySelector('.leaderboard');
      if (leaderboardSection) leaderboardSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Insert coin buttons
const insertCoinBtns = document.querySelectorAll(".insert-coin");
insertCoinBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    console.log('Insert coin button clicked');
    const isLoggedIn = document.body.classList.contains('logged-in') || window.userData;

    if (!isLoggedIn && !guestUser) {
      const result = await promptForUserInfo();
      if (!result) return;
      guestUser = result;
    }

    const machine = btn.closest('.machine');
    const gameTitle = machine.querySelector('h3').textContent;
    let modalId = '';
    let gameType = '';

    switch (gameTitle) {
      case 'Code Quiz':
        modalId = 'code-quiz-modal';
        gameType = 'code-quiz';
        break;
      case 'AI/ML Game':
        modalId = 'ai-ml-modal';
        gameType = 'ai-ml';
        break;
      case 'Speed Typing':
        modalId = 'speed-typing-modal';
        gameType = 'speed-typing';
        break;
      case 'Cyber Security':
        modalId = 'cyber-security-modal';
        gameType = 'cyber-security';
        break;
      case 'Data Science':
        modalId = 'data-science-modal';
        gameType = 'data-science';
        break;
      case 'Web Dev Challenge':
        modalId = 'web-dev-modal';
        gameType = 'web-dev';
        break;
      default:
        console.error('Unknown game title:', gameTitle);
        return;
    }

    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }

    // Start the game
    if (gameType === 'speed-typing') {
      startTypingGame(selectedDifficulty[gameType]);
    } else {
      await startGame(gameType, selectedDifficulty[gameType]);
    }
  });
});

// Close modal
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('close-modal') || e.target.classList.contains('game-modal')) {
    const modal = e.target.closest('.game-modal');
    if (modal) {
      modal.classList.remove('show');
      // Reset game state
      if (timerInterval) clearInterval(timerInterval);
    }
  }
});

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Game machine hover effects
const machines = document.querySelectorAll('.machine');
machines.forEach(machine => {
  machine.addEventListener('mouseenter', () => {
    machine.style.transform = 'translateY(-10px) scale(1.02)';
  });

  machine.addEventListener('mouseleave', () => {
    machine.style.transform = 'translateY(0) scale(1)';
  });
});

// Difficulty level selection
const levels = document.querySelectorAll('.level');
levels.forEach(level => {
  level.addEventListener('mouseenter', () => {
    level.style.transform = 'scale(1.05)';
    level.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    level.style.cursor = 'pointer';
  });

  level.addEventListener('mouseleave', () => {
    level.style.transform = 'scale(1)';
    level.style.boxShadow = 'none';
  });

  level.addEventListener('click', () => {
    console.log('Difficulty level clicked');
    const machine = level.closest('.machine');
    const gameTitle = machine.querySelector('h3').textContent;
    let gameType = '';

    switch (gameTitle) {
      case 'Code Quiz':
        gameType = 'code-quiz';
        break;
      case 'AI/ML Game':
        gameType = 'ai-ml';
        break;
      case 'Speed Typing':
        gameType = 'speed-typing';
        break;
      case 'Cyber Security':
        gameType = 'cyber-security';
        break;
      case 'Data Science':
        gameType = 'data-science';
        break;
      case 'Web Dev Challenge':
        gameType = 'web-dev';
        break;
    }

    const difficulty = level.textContent.toLowerCase();
    selectedDifficulty[gameType] = difficulty;

    const machineLevels = machine.querySelectorAll('.level');
    machineLevels.forEach(l => l.classList.remove('selected'));
    level.classList.add('selected');
  });
});

// Hero background animation
const hero = document.querySelector('.hero');
let animationId;

function animateHero() {
  const time = Date.now() * 0.001;
  const x = Math.sin(time) * 5;
  const y = Math.cos(time) * 5;
  if (hero) hero.style.backgroundPosition = `${x}px ${y}px`;
  animationId = requestAnimationFrame(animateHero);
}

if (hero) {
  animateHero();
}

// Achievements system
const achievements = {
  firstVisit: false,
  coinInserted: false
};

function checkAchievements() {
  if (!achievements.firstVisit) {
    achievements.firstVisit = true;
    console.log('🏆 Achievement Unlocked: Arcade Visitor!');
  }

  const bgMusic = document.getElementById("bg-music");
  if (bgMusic && bgMusic.played && bgMusic.played.length > 0 && !achievements.musicPlayed) {
    achievements.musicPlayed = true;
    console.log('🏆 Achievement Unlocked: Arcade Soundtrack!');
  }
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('insert-coin')) {
    achievements.coinInserted = true;
  }
  checkAchievements();
});

// Load leaderboard function
async function loadLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    if (response.ok) {
      const data = await response.json();
      updateLeaderboard(data);
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

// Update leaderboard display
function updateLeaderboard(data) {
  const leaderboardContent = document.getElementById('leaderboard-content');
  const tabs = document.querySelectorAll('.tab-btn');

  function renderLeaderboard(gameType) {
    if (leaderboardContent && data[gameType]) {
      leaderboardContent.innerHTML = data[gameType].slice(0, 5).map((entry, index) => `
        <div class="leaderboard-item">
          <span class="rank">#${index + 1}</span>
          <span class="name">${entry.name}</span>
          <span class="score">${entry.score}</span>
        </div>
      `).join('');
    } else {
      leaderboardContent.innerHTML = '<p>No data available for this game.</p>';
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const gameType = tab.getAttribute('data-game');
      renderLeaderboard(gameType);
    });
  });

  // Initial render
  renderLeaderboard('code-quiz');

  // Update user scores if logged in
  if (window.userData) {
    const userScoresDiv = document.getElementById('user-scores');
    if (userScoresDiv) {
      // This would need to be implemented based on your backend API
      userScoresDiv.style.display = 'block';
    }
  }
}