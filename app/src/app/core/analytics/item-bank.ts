/* =====================================================================
   Question bank for the demo test engine (copied from the prototype's
   hb-analytics.js). Every question is tagged section > area > sub-area >
   level, the way the real item bank is. In production the real test
   engine owns questions; only the report engine reads the answer rows.
   [area, sub-area, LOD, question, options, correct index]
   ===================================================================== */
export type BankItem = [string, string, string, string, string[], number];

export const BANK: Record<string, { id: string; items: BankItem[] }> = {
  'Quantitative Aptitude': { id: 'QA', items: [
    ['Arithmetic', 'Profit & Loss', 'Medium', 'A shopkeeper marks an item 40% above cost and then allows a 25% discount. What is his profit percentage?', ['5%', '10%', '15%', '12.5%'], 0],
    ['Arithmetic', 'Time, Speed & Distance', 'Easy', 'A train 180 m long crosses a pole in 9 seconds. What is its speed?', ['54 km/h', '64 km/h', '72 km/h', '80 km/h'], 2],
    ['Arithmetic', 'Ratio & Proportion', 'Easy', 'If the ratio of two numbers is 3:5 and their sum is 96, the larger number is:', ['36', '54', '60', '64'], 2],
    ['Arithmetic', 'Time & Work', 'Medium', 'Two pipes fill a tank in 12 and 18 minutes. Working together, they fill it in:', ['6.8 min', '7.2 min', '8.4 min', '9 min'], 1],
    ['Arithmetic', 'Percentages', 'Easy', 'What is 15% of 240?', ['32', '36', '38', '40'], 1],
    ['Arithmetic', 'Interest', 'Medium', '₹10,000 is invested at 10% a year, compounded annually. What interest does it earn in 2 years?', ['₹2,000', '₹2,100', '₹2,200', '₹2,010'], 1],
    ['Number System', 'HCF & LCM', 'Easy', 'What is the LCM of 12, 18 and 30?', ['90', '120', '180', '360'], 2],
    ['Modern Maths', 'Probability', 'Difficult', 'Two dice are thrown. What is the probability that the sum is 8?', ['1/6', '5/36', '1/9', '7/36'], 1],
    ['Algebra', 'Linear Equations', 'Medium', 'If 3x − 7 = 2x + 5, then x equals:', ['10', '12', '−2', '2.4'], 1],
    ['Arithmetic', 'Averages', 'Difficult', "The average age of 30 students is 15. When the teacher's age is included, the average rises by 1. What is the teacher's age?", ['31', '45', '46', '47'], 2]
  ] },
  'Logical Reasoning': { id: 'LR', items: [
    ['Series', 'Number Series', 'Easy', 'Find the next term in the series: 3, 6, 11, 18, 27, ?', ['36', '38', '40', '42'], 1],
    ['Coding-Decoding', 'Letter Coding', 'Easy', 'If CAT is coded as 3-1-20, how is DOG coded?', ['4-15-7', '4-14-7', '3-15-7', '5-15-8'], 0],
    ['Blood Relations', 'Family Tree', 'Medium', 'Pointing to a girl, Rahul says, “She is the daughter of my mother\'s only son.” How is the girl related to Rahul?', ['Sister', 'Daughter', 'Niece', 'Cousin'], 1],
    ['Syllogisms', 'Two-Statement', 'Medium', 'All pens are books. Some books are red. Which conclusion definitely follows?', ['All pens are red', 'Some pens are red', 'No pen is red', 'None of these'], 3],
    ['Direction Sense', 'Distance', 'Medium', 'Riya walks 6 km north, turns right and walks 8 km. How far is she from where she started?', ['10 km', '12 km', '14 km', '2 km'], 0],
    ['Arrangements', 'Linear Seating', 'Medium', 'Five friends A, B, C, D and E sit in a row facing north. E is at the extreme left and C at the extreme right. D is immediately to the left of C, and A is immediately to the left of B. Who sits in the middle?', ['A', 'B', 'D', 'E'], 1],
    ['Series', 'Letter Series', 'Medium', 'What comes next: B, E, H, K, ?', ['M', 'N', 'O', 'L'], 1],
    ['Analogies', 'Word Analogy', 'Easy', 'Book is to Author as Painting is to:', ['Canvas', 'Painter', 'Brush', 'Gallery'], 1],
    ['Coding-Decoding', 'Letter Coding', 'Difficult', 'In a code, MONKEY is written as XDJMNL. How is TIGER written in that code?', ['QDFHS', 'SHFDQ', 'UJHFS', 'QDFGS'], 0],
    ['Syllogisms', 'Two-Statement', 'Difficult', 'No cat is a dog. All dogs are animals. Conclusions: I. Some animals are not cats. II. No animal is a cat.', ['Only I follows', 'Only II follows', 'Both follow', 'Neither follows'], 0]
  ] },
  'Verbal Ability': { id: 'VA', items: [
    ['Vocabulary', 'Antonyms', 'Easy', 'Choose the word most nearly OPPOSITE in meaning to ‘CANDID’.', ['Frank', 'Evasive', 'Blunt', 'Honest'], 1],
    ['Vocabulary', 'Spellings', 'Easy', 'Select the correctly spelt word.', ['Occurence', 'Occurrance', 'Occurrence', 'Ocurrence'], 2],
    ['Grammar', 'Fill in the Blanks', 'Easy', 'Fill in the blank: She is not only intelligent ____ hardworking.', ['and', 'but also', 'as well', 'either'], 1],
    ['Grammar', 'Error Spotting', 'Medium', 'Identify the error: ‘Each of the students have submitted their assignment.’', ['Each of', 'have submitted', 'their assignment', 'No error'], 1],
    ['Vocabulary', 'Synonyms', 'Medium', 'Choose the word closest in meaning to ‘METICULOUS’.', ['Careless', 'Thorough', 'Hasty', 'Generous'], 1],
    ['Grammar', 'Sentence Correction', 'Medium', 'Choose the grammatically correct sentence.', ["He don't like coffee.", "He doesn't likes coffee.", "He doesn't like coffee.", 'He not like coffee.'], 2],
    ['Reading Comprehension', 'Inference', 'Difficult', '“Remote work cut commuting time for many employees, yet surveys show a large share of them now work longer hours than before.” Which inference is best supported?', ['Remote work reduces total working hours', 'Time saved on commuting is often spent working', 'Employees dislike remote work', 'Commuting time has increased'], 1],
    ['Verbal Reasoning', 'Para Jumbles', 'Difficult', 'Arrange into a sentence — P: she started a small bakery  Q: After losing her job,  R: which now employs twenty people.  S: with her savings', ['QSPR', 'SQPR', 'QPSR', 'PQSR'], 0],
    ['Vocabulary', 'Idioms', 'Medium', '‘To burn the midnight oil’ means:', ['To waste resources', 'To work late into the night', 'To start a fire', 'To be very angry'], 1],
    ['Reading Comprehension', 'Main Idea', 'Medium', '“Bees pollinate a third of the crops we eat. Their numbers are falling because of pesticides and habitat loss.” What is the main point?', ['Bees are dangerous insects', 'Pesticides are cheap', 'Falling bee numbers put food production at risk', 'Habitat loss only affects bees'], 2]
  ] },
  'Data Interpretation': { id: 'DI', items: [
    ['Tables', 'Growth Rates', 'Medium', "A company's sales were 120, 150, 180 and 210 units over four quarters. What was the percentage growth from Q1 to Q4?", ['60%', '75%', '80%', '90%'], 1],
    ['Pie Charts', 'Share of Total', 'Medium', 'In a pie chart of a ₹7,200 budget, marketing takes 60°. What is the marketing spend?', ['₹1,200', '₹1,440', '₹1,800', '₹2,400'], 0],
    ['Tables', 'Averages', 'Medium', 'The average of 5 observations is 48. If one observation of 60 is removed, the new average is:', ['44', '45', '46', '47'], 1],
    ['Bar Charts', 'Share of Total', 'Easy', 'A bar chart shows quarterly profits of 20, 25, 15 and 40 lakh. Which quarter made 40% of the annual profit?', ['Q1', 'Q2', 'Q3', 'Q4'], 3],
    ['Line Graphs', 'Growth Rates', 'Medium', 'Revenue was ₹50 cr in 2021, ₹60 cr in 2022 and ₹75 cr in 2023. By what percentage did revenue grow in 2023?', ['15%', '20%', '25%', '50%'], 2],
    ['Tables', 'Percentages', 'Medium', 'Department A has 120 students (40% girls) and Department B has 80 (55% girls). How many girls are there in all?', ['88', '92', '96', '100'], 1],
    ['Caselets', 'Sets', 'Difficult', 'Of 200 employees, 120 speak Hindi, 90 speak English and 30 speak neither. How many speak both?', ['30', '40', '50', '60'], 1],
    ['Pie Charts', 'Comparison', 'Difficult', 'Rent takes 25% and food 35% of a ₹40,000 monthly budget. How much more is spent on food than on rent?', ['₹2,000', '₹4,000', '₹6,000', '₹10,000'], 1],
    ['Bar Charts', 'Ratios', 'Difficult', "Production was 400, 500 and 450 tonnes in three years. What is the ratio of the third year's output to the three-year average?", ['1 : 1', '9 : 10', '10 : 9', '5 : 4'], 0],
    ['Bar Charts', 'Comparison', 'Easy', 'Sales were 30 units in January and 45 in February. How many more units were sold in February?', ['10', '15', '20', '25'], 1]
  ] },
  'Technical Aptitude': { id: 'TA', items: [
    ['DBMS', 'Keys', 'Easy', 'In a relational database, which key uniquely identifies each row in a table?', ['Foreign key', 'Primary key', 'Candidate key', 'Composite key'], 1],
    ['Data Structures & Algorithms', 'Complexity', 'Medium', 'What is the time complexity of binary search on a sorted array of n elements?', ['O(n)', 'O(n log n)', 'O(log n)', 'O(1)'], 2],
    ['Computer Networks', 'OSI Model', 'Medium', 'Which layer of the OSI model routes packets between networks?', ['Data link', 'Network', 'Transport', 'Session'], 1],
    ['OOP', 'Concepts', 'Easy', 'In object-oriented programming, hiding internal state behind methods is called:', ['Inheritance', 'Polymorphism', 'Encapsulation', 'Abstraction'], 2],
    ['Operating Systems', 'Deadlocks', 'Difficult', 'Which of these is NOT one of the four conditions needed for a deadlock?', ['Mutual exclusion', 'Hold and wait', 'Preemption', 'Circular wait'], 2],
    ['Data Structures & Algorithms', 'Data Structures', 'Easy', 'Which data structure works on Last In, First Out?', ['Queue', 'Stack', 'Linked list', 'Tree'], 1],
    ['DBMS', 'SQL', 'Medium', 'Which SQL clause filters groups after aggregation?', ['WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'], 2],
    ['Programming', 'Output', 'Difficult', 'In Python, what does print(len([1, [2, 3], 4])) output?', ['3', '4', '2', 'Error'], 0],
    ['Computer Networks', 'Protocols', 'Easy', 'Which protocol is used to send email?', ['FTP', 'SMTP', 'HTTP', 'DNS'], 1],
    ['Data Structures & Algorithms', 'Sorting', 'Medium', 'What is the worst-case time complexity of quicksort?', ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], 2]
  ] },
  'Domain Knowledge': { id: 'DK', items: [
    ['Electrical', "Ohm's Law", 'Easy', 'A 12 V supply drives current through a 4 Ω resistor. What is the current?', ['2 A', '3 A', '4 A', '48 A'], 1],
    ['Mechanics', 'Units', 'Easy', 'What is the SI unit of force?', ['Joule', 'Pascal', 'Newton', 'Watt'], 2],
    ['Digital Electronics', 'Logic Gates', 'Medium', 'Which gate outputs 1 only when both inputs are 1?', ['OR', 'AND', 'XOR', 'NAND'], 1],
    ['Thermodynamics', 'Laws', 'Medium', 'The first law of thermodynamics is a statement of the conservation of:', ['Mass', 'Momentum', 'Energy', 'Charge'], 2],
    ['Materials', 'Properties', 'Medium', "Which property describes a material's resistance to scratching or indentation?", ['Ductility', 'Hardness', 'Malleability', 'Elasticity'], 1],
    ['Electrical', 'Power', 'Medium', 'An appliance on a 230 V supply draws 2 A. How much power does it use?', ['115 W', '230 W', '460 W', '920 W'], 2],
    ['Digital Electronics', 'Number Systems', 'Medium', 'The binary number 1011 equals which decimal number?', ['9', '10', '11', '13'], 2],
    ['Mechanics', 'Kinematics', 'Difficult', 'A body starts from rest with an acceleration of 2 m/s². How far does it travel in 5 seconds?', ['10 m', '20 m', '25 m', '50 m'], 2],
    ['Electronics', 'Semiconductors', 'Medium', 'In an n-type semiconductor, the majority charge carriers are:', ['Holes', 'Electrons', 'Protons', 'Ions'], 1],
    ['Mechanics', 'Energy', 'Difficult', 'A 2 kg ball moves at 3 m/s. What is its kinetic energy?', ['3 J', '6 J', '9 J', '18 J'], 2]
  ] }
};

export interface CodingItem {
  fn: string; area: string; sub: string; lod: string; baseTime: number; title: string; text: string;
  starter: string; samples: [unknown[], unknown][]; tests: [unknown[], unknown][];
}

export const CODING: Record<string, CodingItem> = {
  'CODE-001': {
    fn: 'sumDigits', area: 'Programming Basics', sub: 'Number Manipulation', lod: 'Easy', baseTime: 420,
    title: 'Sum of digits',
    text: 'Write a function sumDigits(n) that returns the sum of the digits of a non-negative whole number n. Example: sumDigits(123) returns 6.',
    starter: 'function sumDigits(n) {\n  // your code here\n}\n',
    samples: [[[123], 6], [[7], 7]],
    tests: [[[0], 0], [[7], 7], [[123], 6], [[9999], 36], [[1000000], 1], [[987654321], 45]]
  },
  'CODE-002': {
    fn: 'isPalindrome', area: 'Strings', sub: 'String Processing', lod: 'Medium', baseTime: 600,
    title: 'Palindrome check',
    text: 'Write a function isPalindrome(s) that returns true if s reads the same forwards and backwards, ignoring upper/lower case and any character that is not a letter or a digit. Example: isPalindrome("A man, a plan, a canal: Panama") returns true.',
    starter: 'function isPalindrome(s) {\n  // your code here\n}\n',
    samples: [[['madam'], true], [['Hello'], false]],
    tests: [[['madam'], true], [['Hello'], false], [['A man, a plan, a canal: Panama'], true], [[''], true], [["No 'x' in Nixon"], true], [['ab'], false], [['12321'], true]]
  },
  'CODE-003': {
    fn: 'secondLargest', area: 'Arrays', sub: 'Searching', lod: 'Medium', baseTime: 660,
    title: 'Second largest number',
    text: 'Write a function secondLargest(arr) that returns the second largest DISTINCT number in the array, or null if there is none. Example: secondLargest([10, 9, 10, 8]) returns 9.',
    starter: 'function secondLargest(arr) {\n  // your code here\n}\n',
    samples: [[[[3, 1, 4]], 3], [[[5, 5, 5]], null]],
    tests: [[[[3, 1, 4]], 3], [[[5, 5, 5]], null], [[[1]], null], [[[]], null], [[[-2, -5, -1]], -2], [[[10, 9, 10, 8]], 9], [[[1, 2]], 1]]
  }
};
