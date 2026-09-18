const $ = (id) => document.getElementById(id);
const API = window.API_BASE || "";
const termOut = $("termOut");
const termIn = $("termIn");

const SAMPLES = [
  ["Alumni directory",
   "SELECT a.AlumniID, a.FirstName || ' ' || a.LastName AS FullName,\n       d.DeptName, b.BatchYear, c.CompanyName, a.CurrentPosition\nFROM ALUMNI a\nLEFT JOIN DEPARTMENT d ON a.DeptID = d.DeptID\nLEFT JOIN BATCH b ON a.BatchID = b.BatchID\nLEFT JOIN COMPANY c ON a.CompanyID = c.CompanyID\nORDER BY a.AlumniID;"],
  ["Alumni phone numbers (multivalued)",
   "SELECT a.AlumniID, a.FirstName || ' ' || a.LastName AS FullName,\n       p.PhoneNumber\nFROM ALUMNI a\nJOIN ALUMNI_PHONE p ON a.AlumniID = p.AlumniID\nORDER BY a.AlumniID, p.PhoneNumber;"],
  ["Mentorship pairs (weak entity)",
   "SELECT m.AlumniID, al.FirstName || ' ' || al.LastName AS Mentor,\n       m.MentorshipID, s.StudentID,\n       s.FirstName || ' ' || s.LastName AS StudentName,\n       m.MentorshipArea, m.Status\nFROM MENTORSHIP m\nJOIN ALUMNI al ON m.AlumniID = al.AlumniID\nJOIN STUDENT s ON m.StudentID = s.StudentID\nORDER BY m.AlumniID, m.MentorshipID;"],
  ["Donations above average",
   "SELECT dn.DonationID, a.FirstName || ' ' || a.LastName AS Donor,\n       dn.Amount, dn.DonationDate, dn.PaymentMethod\nFROM DONATION dn\nJOIN ALUMNI a ON dn.DonorID = a.AlumniID\nWHERE dn.Amount > (SELECT AVG(Amount) FROM DONATION)\nORDER BY dn.Amount DESC;"],
  ["Events + attendance (M:N)",
   "SELECT e.EventName, e.EventType, e.EventDate, e.Venue,\n       COUNT(ae.AlumniID) AS Attendees\nFROM EVENT e\nLEFT JOIN ALUMNI_EVENT ae ON e.EventID = ae.EventID\nGROUP BY e.EventName, e.EventType, e.EventDate, e.Venue\nORDER BY e.EventDate;"],
  ["Jobs posted by alumni",
   "SELECT j.JobTitle, c.CompanyName, j.JobType, j.Salary,\n       a.FirstName || ' ' || a.LastName AS PostedBy\nFROM JOB j\nJOIN COMPANY c ON j.CompanyID = c.CompanyID\nJOIN ALUMNI a ON j.PostedBy = a.AlumniID\nORDER BY c.CompanyName;"],
  ["Donation totals per donor",
   "SELECT a.AlumniID, a.FirstName || ' ' || a.LastName AS Donor,\n       COUNT(*) AS Donations, SUM(dn.Amount) AS TotalAmount\nFROM DONATION dn\nJOIN ALUMNI a ON dn.DonorID = a.AlumniID\nGROUP BY a.AlumniID, a.FirstName, a.LastName\nORDER BY TotalAmount DESC;"],
  ["Skills of each alumni (M:N)",
   "SELECT a.FirstName || ' ' || a.LastName AS Alumni,\n       s.SkillName, s.SkillCategory\nFROM ALUMNI_SKILL ask\nJOIN ALUMNI a ON ask.AlumniID = a.AlumniID\nJOIN SKILL s ON ask.SkillID = s.SkillID\nORDER BY 1;"],
  ["Students + emails (multivalued)",
   "SELECT st.StudentID, st.FirstName || ' ' || st.LastName AS StudentName,\n       se.Email, st.CGPA\nFROM STUDENT st\nLEFT JOIN STUDENT_EMAIL se ON st.StudentID = se.StudentID\nORDER BY st.StudentID, se.Email;"],

  // === LAB EXERCISES - Day 1 & 2: DDL ===
  ["LAB: DDL", "CREATE TABLE with PK",
   "CREATE TABLE Employees (\n    EmpID INT PRIMARY KEY,\n    Name VARCHAR(50),\n    Department VARCHAR(30),\n    Salary DECIMAL(10, 2)\n);"],
  ["LAB: DDL", "ALTER TABLE ADD COLUMN",
   "ALTER TABLE Employees\nADD Email VARCHAR(100);"],
  ["LAB: DDL", "ALTER TABLE MODIFY COLUMN",
   "ALTER TABLE Employees\nMODIFY Salary FLOAT;"],
  ["LAB: DDL", "ALTER TABLE DROP COLUMN",
   "ALTER TABLE Employees\nDROP COLUMN Email;"],
  ["LAB: DDL", "ALTER TABLE RENAME TABLE",
   "ALTER TABLE Employees\nRENAME TO Staff;"],
  ["LAB: DDL", "CREATE TABLE with DEFAULT",
   "CREATE TABLE Departments (\n    DeptID INT PRIMARY KEY,\n    DeptName VARCHAR(50),\n    CreatedDate DATE DEFAULT CURRENT_DATE\n);"],
  ["LAB: DDL", "DROP TABLE",
   "DROP TABLE Projects;"],
  ["LAB: DDL", "TRUNCATE TABLE",
   "TRUNCATE TABLE Staff;"],
  ["LAB: DDL", "CREATE TABLE with CHECK",
   "CREATE TABLE Inventory (\n    ItemID INT PRIMARY KEY,\n    ItemName VARCHAR(100),\n    Quantity INT CHECK (Quantity >= 0)\n);"],
  ["LAB: DDL", "CHECK age between 18 and 60",
   "ALTER TABLE Employees\nADD CONSTRAINT chk_age CHECK (Age BETWEEN 18 AND 60);"],
  ["LAB: DDL", "CHECK Gender M or F",
   "ALTER TABLE Employees\nADD CONSTRAINT chk_gender CHECK (Gender IN ('M', 'F'));"],
  ["LAB: DDL", "CHECK phone 10 digits",
   "ALTER TABLE Employees\nADD CONSTRAINT chk_phone CHECK (LENGTH(PhoneNumber) = 10);"],

  // === LAB EXERCISES - Day 1 & 2: DML ===
  ["LAB: DML", "INSERT records",
   "INSERT INTO ALUMNI (AlumniID, FirstName, LastName, Email, DeptID, BatchID, CompanyID, CurrentPosition)\nVALUES (6, 'Rahul', 'Sharma', 'rahul@email.com', 10, 1, 101, 'Developer');"],
  ["LAB: DML", "SELECT all records",
   "SELECT * FROM ALUMNI;"],
  ["LAB: DML", "SELECT with WHERE",
   "SELECT * FROM ALUMNI WHERE DeptID = 10;"],
  ["LAB: DML", "SELECT with AND/OR",
   "SELECT * FROM ALUMNI WHERE DeptID = 10 AND IsActive = 1;"],
  ["LAB: DML", "SELECT with IN",
   "SELECT * FROM ALUMNI WHERE DeptID IN (10, 11, 12);"],
  ["LAB: DML", "SELECT with LIKE starts with A",
   "SELECT * FROM ALUMNI WHERE FirstName LIKE 'A%';"],
  ["LAB: DML", "SELECT with LIKE ends with N",
   "SELECT * FROM ALUMNI WHERE LastName LIKE '%n';"],
  ["LAB: DML", "SELECT with LIKE contains RA",
   "SELECT * FROM ALUMNI WHERE FirstName LIKE '%RA%';"],
  ["LAB: DML", "SELECT with BETWEEN",
   "SELECT * FROM DONATION WHERE Amount BETWEEN 30000 AND 60000;"],
  ["LAB: DML", "SELECT sorted ASC",
   "SELECT * FROM ALUMNI ORDER BY FirstName ASC;"],
  ["LAB: DML", "SELECT sorted DESC",
   "SELECT * FROM DONATION ORDER BY Amount DESC;"],
  ["LAB: DML", "UPDATE records",
   "UPDATE ALUMNI SET CurrentPosition = 'Senior Engineer' WHERE AlumniID = 1;"],
  ["LAB: DML", "DELETE records",
   "DELETE FROM ALUMNI WHERE AlumniID = 6;"],

  // === LAB EXERCISES - Day 3: Single Row Functions ===
  ["LAB: Functions", "Numeric: SQRT",
   "SELECT SQRT(Salary) FROM ALUMNI;"],
  ["LAB: Functions", "Numeric: ABS",
   "SELECT ABS(Amount) FROM DONATION;"],
  ["LAB: Functions", "Numeric: CEIL",
   "SELECT CEIL(Amount) FROM DONATION;"],
  ["LAB: Functions", "Numeric: FLOOR",
   "SELECT FLOOR(Amount) FROM DONATION;"],
  ["LAB: Functions", "Numeric: ROUND",
   "SELECT ROUND(Amount, 2) FROM DONATION;"],
  ["LAB: Functions", "String: SUBSTR first 5 chars",
   "SELECT SUBSTR(FirstName, 1, 5) FROM ALUMNI;"],
  ["LAB: Functions", "String: UPPER",
   "SELECT UPPER(FirstName) FROM ALUMNI;"],
  ["LAB: Functions", "String: LOWER",
   "SELECT LOWER(Email) FROM ALUMNI;"],
  ["LAB: Functions", "String: LENGTH",
   "SELECT LENGTH(FirstName) FROM ALUMNI;"],
  ["LAB: Functions", "String: TRIM",
   "SELECT TRIM(FirstName) FROM ALUMNI;"],
  ["LAB: Functions", "String: CONCAT",
   "SELECT FirstName || ' ' || LastName AS FullName FROM ALUMNI;"],
  ["LAB: Functions", "Date: CURRENT_DATE",
   "SELECT CURRENT_DATE;"],
  ["LAB: Functions", "Date: date + 2 months",
   "SELECT DATE(DateOfBirth, '+2 months') FROM ALUMNI;"],
  ["LAB: Functions", "Date: last day of month",
   "SELECT DATE('2025-10-05', 'start of month', '+1 month', '-1 day');"],
  ["LAB: Functions", "Date: 60 days before today",
   "SELECT DATE('now', '-60 days');"],
  ["LAB: Functions", "Date: month name",
   "SELECT STRFTIME('%m', DateOfBirth) FROM ALUMNI;"],
  ["LAB: Functions", "Date: format dd-mm-yy",
   "SELECT STRFTIME('%d-%m-%y', DateOfBirth) FROM ALUMNI;"],
  ["LAB: Functions", "Date: born in August",
   "SELECT * FROM ALUMNI WHERE CAST(STRFTIME('%m', DateOfBirth) AS INT) = 8;"],
  ["LAB: Functions", "Date: birthday this month",
   "SELECT * FROM ALUMNI WHERE CAST(STRFTIME('%m', DateOfBirth) AS INT) = CAST(STRFTIME('%m', 'now') AS INT);"],
  ["LAB: Functions", "Aggregate: COUNT",
   "SELECT COUNT(*) FROM ALUMNI;"],
  ["LAB: Functions", "Aggregate: SUM",
   "SELECT SUM(Amount) FROM DONATION;"],
  ["LAB: Functions", "Aggregate: AVG",
   "SELECT AVG(Amount) FROM DONATION;"],
  ["LAB: Functions", "Aggregate: MAX/MIN",
   "SELECT MAX(Amount) AS max_amount, MIN(Amount) AS min_amount FROM DONATION;"],
  ["LAB: Functions", "GROUP BY dept",
   "SELECT DeptID, COUNT(*) FROM ALUMNI GROUP BY DeptID;"],
  ["LAB: Functions", "GROUP BY job",
   "SELECT CurrentPosition, COUNT(*) FROM ALUMNI GROUP BY CurrentPosition;"],
  ["LAB: Functions", "GROUP BY with HAVING",
   "SELECT DeptID, COUNT(*) AS cnt FROM ALUMNI GROUP BY DeptID HAVING cnt > 1;"],
  ["LAB: Functions", "Difference MAX-MIN salary",
   "SELECT MAX(Amount) - MIN(Amount) AS diff FROM DONATION;"],
  ["LAB: Functions", "Lowest paid per dept",
   "SELECT DeptID, MIN(Salary) FROM ALUMNI GROUP BY DeptID;"],
  ["LAB: Functions", "Count distinct jobs",
   "SELECT COUNT(DISTINCT CurrentPosition) FROM ALUMNI;"],

  // === LAB EXERCISES - Day 4: JOINS ===
  ["LAB: JOINS", "INNER JOIN",
   "SELECT a.FirstName, d.DeptName FROM ALUMNI a INNER JOIN DEPARTMENT d ON a.DeptID = d.DeptID;"],
  ["LAB: JOINS", "LEFT JOIN",
   "SELECT a.FirstName, d.DeptName FROM ALUMNI a LEFT JOIN DEPARTMENT d ON a.DeptID = d.DeptID;"],
  ["LAB: JOINS", "RIGHT JOIN (simulated)",
   "SELECT a.FirstName, d.DeptName FROM DEPARTMENT d LEFT JOIN ALUMNI a ON d.DeptID = a.DeptID;"],
  ["LAB: JOINS", "FULL OUTER JOIN (simulated)",
   "SELECT a.FirstName, d.DeptName FROM ALUMNI a LEFT JOIN DEPARTMENT d ON a.DeptID = d.DeptID\nUNION\nSELECT a.FirstName, d.DeptName FROM DEPARTMENT d LEFT JOIN ALUMNI a ON d.DeptID = a.DeptID;"],
  ["LAB: JOINS", "CROSS JOIN",
   "SELECT a.FirstName, s.SkillName FROM ALUMNI a CROSS JOIN SKILL s LIMIT 10;"],
  ["LAB: JOINS", "SELF JOIN - same dept pairs",
   "SELECT a1.FirstName AS Alumni1, a2.FirstName AS Alumni2\nFROM ALUMNI a1\nJOIN ALUMNI a2 ON a1.DeptID = a2.DeptID AND a1.AlumniID < a2.AlumniID;"],
  ["LAB: JOINS", "JOIN with WHERE filter",
   "SELECT a.FirstName, d.DeptName, a.CurrentPosition\nFROM ALUMNI a\nJOIN DEPARTMENT d ON a.DeptID = d.DeptID\nWHERE a.CurrentPosition LIKE '%Engineer%';"],
  ["LAB: JOINS", "JOIN with aggregation",
   "SELECT d.DeptName, COUNT(a.AlumniID) AS AlumniCount\nFROM DEPARTMENT d\nLEFT JOIN ALUMNI a ON d.DeptID = a.DeptID\nGROUP BY d.DeptName;"],
  ["LAB: JOINS", "Multiple JOINs",
   "SELECT a.FirstName, d.DeptName, b.BatchYear, c.CompanyName\nFROM ALUMNI a\nJOIN DEPARTMENT d ON a.DeptID = d.DeptID\nJOIN BATCH b ON a.BatchID = b.BatchID\nJOIN COMPANY c ON a.CompanyID = c.CompanyID;"],

  // === LAB EXERCISES - Day 4: Subqueries ===
  ["LAB: Subquery", "Subquery with IN",
   "SELECT * FROM ALUMNI WHERE AlumniID IN (SELECT DonorID FROM DONATION);"],
  ["LAB: Subquery", "Subquery with NOT IN",
   "SELECT * FROM ALUMNI WHERE AlumniID NOT IN (SELECT DonorID FROM DONATION WHERE DonorID IS NOT NULL);"],
  ["LAB: Subquery", "Subquery with EXISTS",
   "SELECT * FROM ALUMNI a WHERE EXISTS (SELECT 1 FROM DONATION d WHERE d.DonorID = a.AlumniID);"],
  ["LAB: Subquery", "Subquery with NOT EXISTS",
   "SELECT * FROM ALUMNI a WHERE NOT EXISTS (SELECT 1 FROM DONATION d WHERE d.DonorID = a.AlumniID);"],
  ["LAB: Subquery", "Correlated subquery",
   "SELECT a.FirstName, a.CurrentPosition,\n       (SELECT COUNT(*) FROM DONATION d WHERE d.DonorID = a.AlumniID) AS DonationCount\nFROM ALUMNI a;"],
  ["LAB: Subquery", "Subquery in FROM clause",
   "SELECT dept_avg.DeptID, dept_avg.AvgAmount\nFROM (\n    SELECT a.DeptID, AVG(d.Amount) AS AvgAmount\n    FROM ALUMNI a\n    JOIN DONATION d ON a.AlumniID = d.DonorID\n    GROUP BY a.DeptID\n) dept_avg;"],
  ["LAB: Subquery", "Subquery with > ALL",
   "SELECT * FROM DONATION\nWHERE Amount > ALL (SELECT Amount FROM DONATION WHERE DonorID = 1);"],
  ["LAB: Subquery", "Subquery with > ANY",
   "SELECT * FROM DONATION\nWHERE Amount > ANY (SELECT Amount FROM DONATION WHERE PaymentMethod = 'Check');"],
  ["LAB: Subquery", "Nested subquery",
   "SELECT * FROM ALUMNI\nWHERE DeptID IN (\n    SELECT DeptID FROM BATCH WHERE BatchYear > 2020\n);"],
  ["LAB: Subquery", "Employees earning > avg salary",
   "SELECT a.FirstName, a.CurrentPosition\nFROM ALUMNI a\nWHERE a.AlumniID IN (\n    SELECT DonorID FROM DONATION\n    WHERE Amount > (SELECT AVG(Amount) FROM DONATION)\n);"],

  // === LAB: Additional DDL ===
  ["LAB: DDL+", "Copy table structure",
   "CREATE TABLE company_backup AS SELECT * FROM COMPANY WHERE 1=0;"],
  ["LAB: DDL+", "Copy table with data",
   "CREATE TABLE company_copy AS SELECT * FROM COMPANY;"],
  ["LAB: DDL+", "Rename column",
   "ALTER TABLE COMPANY RENAME COLUMN CompanyName TO Name;"],
  ["LAB: DDL+", "DROP TABLE",
   "DROP TABLE IF EXISTS temp_table;"],
  ["LAB: DDL+", "CREATE TABLE with NOT NULL",
   "CREATE TABLE persons (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    email TEXT\n);"],
  ["LAB: DDL+", "CREATE TABLE with UNIQUE",
   "CREATE TABLE users (\n    user_id INTEGER PRIMARY KEY,\n    username TEXT UNIQUE,\n    email TEXT UNIQUE\n);"],
  ["LAB: DDL+", "CREATE TABLE with FOREIGN KEY",
   "CREATE TABLE orders (\n    order_id INTEGER PRIMARY KEY,\n    customer_id INTEGER,\n    order_date TEXT,\n    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)\n);"],
  ["LAB: DDL+", "CREATE TABLE with ON DELETE CASCADE",
   "CREATE TABLE orders (\n    order_id INTEGER PRIMARY KEY,\n    customer_id INTEGER,\n    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE\n);"],
  ["LAB: DDL+", "CREATE TABLE with CHECK constraint",
   "CREATE TABLE employees (\n    emp_id INTEGER PRIMARY KEY,\n    salary REAL CHECK (salary >= 0),\n    age INTEGER CHECK (age >= 18 AND age <= 65)\n);"],
  ["LAB: DDL+", "CREATE TABLE with DEFAULT value",
   "CREATE TABLE products (\n    product_id INTEGER PRIMARY KEY,\n    product_name TEXT,\n    created_date TEXT DEFAULT CURRENT_DATE,\n    status TEXT DEFAULT 'active'\n);"],
  ["LAB: DDL+", "ALTER TABLE ADD COLUMN",
   "ALTER TABLE COMPANY ADD COLUMN Rating REAL;"],
  ["LAB: DDL+", "ALTER TABLE DROP COLUMN",
   "ALTER TABLE COMPANY DROP COLUMN Rating;"],
  ["LAB: DDL+", "Create INDEX",
   "CREATE INDEX idx_alumni_name ON ALUMNI(LastName);"],
  ["LAB: DDL+", "Create UNIQUE INDEX",
   "CREATE UNIQUE INDEX idx_alumni_email ON ALUMNI(Email);"],
  ["LAB: DDL+", "Drop INDEX",
   "DROP INDEX IF EXISTS idx_alumni_name;"],
  ["LAB: DDL+", "Create VIEW",
   "CREATE VIEW vw_active_alumni AS SELECT * FROM ALUMNI WHERE IsActive = 1;"],
  ["LAB: DDL+", "Drop VIEW",
   "DROP VIEW IF EXISTS vw_active_alumni;"],

  // === LAB: Additional DML (SQLite compatible) ===
  ["LAB: DML+", "INSERT with specific columns",
   "INSERT INTO COMPANY (CompanyID, CompanyName, Industry) VALUES (300, 'NewCorp', 'Tech');"],
  ["LAB: DML+", "INSERT multiple rows",
   "INSERT INTO SKILL VALUES (20, 'DevOps', 'Infra', 'CI/CD'), (21, 'Rust', 'Programming', 'Systems');"],
  ["LAB: DML+", "SELECT with DISTINCT",
   "SELECT DISTINCT Industry FROM COMPANY;"],
  ["LAB: DML+", "SELECT with column alias",
   "SELECT FirstName AS \"First Name\", LastName AS \"Last Name\" FROM ALUMNI;"],
  ["LAB: DML+", "SELECT with string constant",
   "SELECT FirstName, 'VIT Alumni' AS Status FROM ALUMNI;"],
  ["LAB: DML+", "UPDATE with IS NULL",
   "UPDATE ALUMNI SET IsActive = 0 WHERE CompanyID IS NULL;"],
  ["LAB: DML+", "DELETE with IS NULL",
   "DELETE FROM ALUMNI WHERE Email IS NULL;"],
  ["LAB: DML+", "DELETE with WHERE",
   "DELETE FROM COMPANY WHERE CompanyID = 300;"],
  ["LAB: DML+", "SELECT with NOT LIKE",
   "SELECT * FROM ALUMNI WHERE FirstName NOT LIKE 'A%';"],
  ["LAB: DML+", "SELECT with NOT IN",
   "SELECT * FROM ALUMNI WHERE DeptID NOT IN (10, 11);"],
  ["LAB: DML+", "SELECT with NOT BETWEEN",
   "SELECT * FROM DONATION WHERE Amount NOT BETWEEN 30000 AND 50000;"],
  ["LAB: DML+", "SELECT with IS NOT NULL",
   "SELECT * FROM ALUMNI WHERE Email IS NOT NULL;"],
  ["LAB: DML+", "ORDER BY multiple columns",
   "SELECT * FROM ALUMNI ORDER BY DeptID ASC, FirstName DESC;"],
  ["LAB: DML+", "ORDER BY column number",
   "SELECT FirstName, LastName FROM ALUMNI ORDER BY 1;"],
  ["LAB: DML+", "LIMIT results",
   "SELECT * FROM ALUMNI LIMIT 3;"],
  ["LAB: DML+", "LIMIT with OFFSET",
   "SELECT * FROM ALUMNI LIMIT 2 OFFSET 2;"],

  // === LAB: Additional Functions (SQLite compatible) ===
  ["LAB: Functions+", "COUNT DISTINCT",
   "SELECT COUNT(DISTINCT DeptID) FROM ALUMNI;"],
  ["LAB: Functions+", "COUNT with WHERE",
   "SELECT COUNT(*) FROM ALUMNI WHERE DeptID = 10;"],
  ["LAB: Functions+", "SUM with WHERE",
   "SELECT SUM(Amount) FROM DONATION WHERE DonorID = 1;"],
  ["LAB: Functions+", "AVG with GROUP BY",
   "SELECT DeptID, AVG(AlumniID) FROM ALUMNI GROUP BY DeptID;"],
  ["LAB: Functions+", "MAX with GROUP BY",
   "SELECT DeptID, MAX(AlumniID) FROM ALUMNI GROUP BY DeptID;"],
  ["LAB: Functions+", "MIN with GROUP BY",
   "SELECT DeptID, MIN(AlumniID) FROM ALUMNI GROUP BY DeptID;"],
  ["LAB: Functions+", "GROUP BY multiple columns",
   "SELECT DeptID, BatchID, COUNT(*) FROM ALUMNI GROUP BY DeptID, BatchID;"],
  ["LAB: Functions+", "HAVING with COUNT",
   "SELECT DeptID, COUNT(*) AS cnt FROM ALUMNI GROUP BY DeptID HAVING cnt > 1;"],
  ["LAB: Functions+", "HAVING with SUM",
   "SELECT DonorID, SUM(Amount) AS total FROM DONATION GROUP BY DonorID HAVING total > 50000;"],
  ["LAB: Functions+", "HAVING with AVG",
   "SELECT DonorID, AVG(Amount) AS avg_amt FROM DONATION GROUP BY DonorID HAVING avg_amt > 40000;"],
  ["LAB: Functions+", "ROUND function",
   "SELECT ROUND(Amount, 2) FROM DONATION;"],
  ["LAB: Functions+", "ABS function",
   "SELECT ABS(-100);"],
  ["LAB: Functions+", "LENGTH function",
   "SELECT LENGTH(FirstName) FROM ALUMNI;"],
  ["LAB: Functions+", "SUBSTR function",
   "SELECT SUBSTR(FirstName, 1, 3) FROM ALUMNI;"],
  ["LAB: Functions+", "UPPER function",
   "SELECT UPPER(FirstName) FROM ALUMNI;"],
  ["LAB: Functions+", "LOWER function",
   "SELECT LOWER(Email) FROM ALUMNI;"],
  ["LAB: Functions+", "TRIM function",
   "SELECT TRIM(FirstName) FROM ALUMNI;"],
  ["LAB: Functions+", "REPLACE function",
   "SELECT REPLACE(FirstName, 'a', 'X') FROM ALUMNI;"],
  ["LAB: Functions+", "TYPEOF function",
   "SELECT TYPEOF(Amount) FROM DONATION;"],
  ["LAB: Functions+", "LAST_INSERT_ROWID",
   "SELECT LAST_INSERT_ROWID();"],
  ["LAB: Functions+", "CHANGES function",
   "SELECT CHANGES();"],
  ["LAB: Functions+", "SQLITE_VERSION",
   "SELECT SQLITE_VERSION();"],

  // === LAB: Date Functions (SQLite compatible) ===
  ["LAB: Date", "CURRENT_DATE",
   "SELECT CURRENT_DATE;"],
  ["LAB: Date", "CURRENT_TIME",
   "SELECT CURRENT_TIME;"],
  ["LAB: Date", "CURRENT_TIMESTAMP",
   "SELECT CURRENT_TIMESTAMP;"],
  ["LAB: Date", "DATE now",
   "SELECT DATE('now');"],
  ["LAB: Date", "DATE add days",
   "SELECT DATE('now', '+7 days');"],
  ["LAB: Date", "DATE subtract days",
   "SELECT DATE('now', '-30 days');"],
  ["LAB: Date", "DATE add months",
   "SELECT DATE('now', '+3 months');"],
  ["LAB: Date", "DATETIME now",
   "SELECT DATETIME('now');"],
  ["LAB: Date", "STRFTIME year",
   "SELECT STRFTIME('%Y', 'now');"],
  ["LAB: Date", "STRFTIME month",
   "SELECT STRFTIME('%m', 'now');"],
  ["LAB: Date", "STRFTIME day",
   "SELECT STRFTIME('%d', 'now');"],
  ["LAB: Date", "STRFTIME formatted",
   "SELECT STRFTIME('%Y-%m-%d %H:%M:%S', 'now');"],
  ["LAB: Date", "JULIANDAY",
   "SELECT JULIANDAY('now');"],
  ["LAB: Date", "UNIXEPOCH",
   "SELECT UNIXEPOCH('now');"],

  // === LAB: Conversion Functions (SQLite compatible) ===
  ["LAB: Conversion", "CAST to INTEGER",
   "SELECT CAST('123' AS INTEGER);"],
  ["LAB: Conversion", "CAST to REAL",
   "SELECT CAST('123.45' AS REAL);"],
  ["LAB: Conversion", "CAST to TEXT",
   "SELECT CAST(123 AS TEXT);"],
  ["LAB: Conversion", "TYPEOF integer",
   "SELECT TYPEOF(123);"],
  ["LAB: Conversion", "TYPEOF real",
   "SELECT TYPEOF(123.45);"],
  ["LAB: Conversion", "TYPEOF text",
   "SELECT TYPEOF('Hello');"],
  ["LAB: Conversion", "TYPEOF null",
   "SELECT TYPEOF(NULL);"],
  ["LAB: Conversion", "HEX function",
   "SELECT HEX('A');"],
  ["LAB: Conversion", "UNHEX function",
   "SELECT UNHEX('41');"],
  ["LAB: Conversion", "PRINTF function",
   "SELECT PRINTF('%.2f', 123.456);"],

  // === LAB: Analytic Functions (SQLite compatible) ===
  ["LAB: Analytic", "ROW_NUMBER",
   "SELECT FirstName, ROW_NUMBER() OVER (ORDER BY AlumniID) AS rn FROM ALUMNI;"],
  ["LAB: Analytic", "RANK",
   "SELECT Amount, RANK() OVER (ORDER BY Amount DESC) AS rnk FROM DONATION;"],
  ["LAB: Analytic", "DENSE_RANK",
   "SELECT Amount, DENSE_RANK() OVER (ORDER BY Amount DESC) AS drnk FROM DONATION;"],
  ["LAB: Analytic", "NTILE",
   "SELECT Amount, NTILE(4) OVER (ORDER BY Amount) AS quartile FROM DONATION;"],
  ["LAB: Analytic", "LEAD",
   "SELECT DonationID, Amount, LEAD(Amount, 1) OVER (ORDER BY DonationID) AS next_amount FROM DONATION;"],
  ["LAB: Analytic", "LAG",
   "SELECT DonationID, Amount, LAG(Amount, 1) OVER (ORDER BY DonationID) AS prev_amount FROM DONATION;"],
  ["LAB: Analytic", "FIRST_VALUE",
   "SELECT DonationID, FIRST_VALUE(Amount) OVER (ORDER BY DonationDate) AS first_amount FROM DONATION;"],
  ["LAB: Analytic", "LAST_VALUE",
   "SELECT DonationID, LAST_VALUE(Amount) OVER (ORDER BY DonationDate ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_amount FROM DONATION;"],
  ["LAB: Analytic", "PERCENT_RANK",
   "SELECT DonationID, PERCENT_RANK() OVER (ORDER BY Amount) AS pct_rank FROM DONATION;"],
  ["LAB: Analytic", "CUME_DIST",
   "SELECT DonationID, CUME_DIST() OVER (ORDER BY Amount) AS cum_dist FROM DONATION;"],
  ["LAB: Analytic", "GROUP_CONCAT",
   "SELECT GROUP_CONCAT(FirstName, ', ') FROM ALUMNI;"],
  ["LAB: Analytic", "GROUP_CONCAT with GROUP BY",
   "SELECT DeptID, GROUP_CONCAT(FirstName, ', ') FROM ALUMNI GROUP BY DeptID;"],
  ["LAB: Analytic", "Window PARTITION BY",
   "SELECT DeptID, FirstName, ROW_NUMBER() OVER (PARTITION BY DeptID ORDER BY AlumniID) FROM ALUMNI;"],
  ["LAB: Analytic", "Running total",
   "SELECT DonationID, Amount, SUM(Amount) OVER (ORDER BY DonationDate ROWS UNBOUNDED PRECEDING) AS running_total FROM DONATION;"],
  ["LAB: Analytic", "Moving average",
   "SELECT DonationID, Amount, AVG(Amount) OVER (ORDER BY DonationDate ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS moving_avg FROM DONATION;"],
  ["LAB: Analytic", "COUNT OVER",
   "SELECT DeptID, FirstName, COUNT(*) OVER (PARTITION BY DeptID) FROM ALUMNI;"],
  ["LAB: Analytic", "SUM OVER",
   "SELECT DonationID, Amount, SUM(Amount) OVER () AS total FROM DONATION;"],
  ["LAB: Analytic", "AVG OVER",
   "SELECT DonationID, Amount, AVG(Amount) OVER () AS avg_amount FROM DONATION;"],
  ["LAB: Analytic", "MAX OVER",
   "SELECT DonationID, Amount, MAX(Amount) OVER () AS max_amount FROM DONATION;"],
  ["LAB: Analytic", "MIN OVER",
   "SELECT DonationID, Amount, MIN(Amount) OVER () AS min_amount FROM DONATION;"],

  // === LAB: Set Operations ===
  ["LAB: Set Ops", "UNION",
   "SELECT FirstName FROM ALUMNI UNION SELECT FirstName FROM STUDENT;"],
  ["LAB: Set Ops", "UNION ALL",
   "SELECT DeptID FROM ALUMNI UNION ALL SELECT DeptID FROM STUDENT;"],
  ["LAB: Set Ops", "INTERSECT",
   "SELECT DeptID FROM ALUMNI INTERSECT SELECT DeptID FROM DEPARTMENT;"],
  ["LAB: Set Ops", "EXCEPT/MINUS",
   "SELECT DeptID FROM DEPARTMENT EXCEPT SELECT DeptID FROM ALUMNI;"],
  ["LAB: Set Ops", "UNION with ORDER BY",
   "SELECT FirstName FROM ALUMNI UNION SELECT FirstName FROM STUDENT ORDER BY 1;"],
  ["LAB: Set Ops", "UNION ALL with WHERE",
   "SELECT * FROM ALUMNI WHERE DeptID = 10 UNION ALL SELECT * FROM ALUMNI WHERE DeptID = 11;"],
  ["LAB: Set Ops", "INTERSECT with WHERE",
   "SELECT AlumniID FROM ALUMNI WHERE DeptID = 10 INTERSECT SELECT AlumniID FROM ALUMNI WHERE DeptID = 10;"],
  ["LAB: Set Ops", "EXCEPT with WHERE",
   "SELECT DeptID FROM DEPARTMENT WHERE DeptID > 10 EXCEPT SELECT DeptID FROM ALUMNI WHERE DeptID < 15;"],
  ["LAB: Set Ops", "Multiple UNION",
   "SELECT FirstName FROM ALUMNI UNION SELECT FirstName FROM STUDENT UNION SELECT FirstName FROM ALUMNI;"],
  ["LAB: Set Ops", "Multiple INTERSECT",
   "SELECT DeptID FROM ALUMNI INTERSECT SELECT DeptID FROM STUDENT INTERSECT SELECT DeptID FROM DEPARTMENT;"],
  ["LAB: Set Ops", "Multiple EXCEPT",
   "SELECT DeptID FROM DEPARTMENT EXCEPT SELECT DeptID FROM ALUMNI EXCEPT SELECT DeptID FROM STUDENT;"],
  ["LAB: Set Ops", "UNION with aliases",
   "SELECT FirstName AS name FROM ALUMNI UNION SELECT FirstName AS name FROM STUDENT;"],
  ["LAB: Set Ops", "UNION ALL with aliases",
   "SELECT FirstName AS name FROM ALUMNI UNION ALL SELECT FirstName AS name FROM STUDENT;"],
  ["LAB: Set Ops", "INTERSECT with aliases",
   "SELECT DeptID AS id FROM ALUMNI INTERSECT SELECT DeptID AS id FROM STUDENT;"],
  ["LAB: Set Ops", "EXCEPT with aliases",
   "SELECT DeptID AS id FROM DEPARTMENT EXCEPT SELECT DeptID AS id FROM ALUMNI;"],
  ["LAB: Set Ops", "UNION with literals",
   "SELECT 'Alumni' AS type, FirstName FROM ALUMNI UNION SELECT 'Student' AS type, FirstName FROM STUDENT;"],
  ["LAB: Set Ops", "UNION ALL with literals",
   "SELECT 'Alumni' AS type, FirstName FROM ALUMNI UNION ALL SELECT 'Student' AS type, FirstName FROM STUDENT;"],
  ["LAB: Set Ops", "INTERSECT with literals",
   "SELECT 'Alumni' AS type, DeptID FROM ALUMNI INTERSECT SELECT 'Student' AS type, DeptID FROM STUDENT;"],
  ["LAB: Set Ops", "EXCEPT with literals",
   "SELECT 'Dept' AS type, DeptID FROM DEPARTMENT EXCEPT SELECT 'Alumni' AS type, DeptID FROM ALUMNI;"],
  ["LAB: Set Ops", "UNION with multiple columns",
   "SELECT DeptID, FirstName FROM ALUMNI UNION SELECT DeptID, FirstName FROM STUDENT;"],
  ["LAB: Set Ops", "UNION ALL with multiple columns",
   "SELECT DeptID, FirstName FROM ALUMNI UNION ALL SELECT DeptID, FirstName FROM STUDENT;"],
  ["LAB: Set Ops", "INTERSECT with multiple columns",
   "SELECT DeptID, AlumniID FROM ALUMNI INTERSECT SELECT DeptID, StudentID FROM STUDENT;"],
  ["LAB: Set Ops", "EXCEPT with multiple columns",
   "SELECT DeptID, DeptName FROM DEPARTMENT EXCEPT SELECT DeptID, CurrentPosition FROM ALUMNI;"],
  ["LAB: Set Ops", "UNION with NULLs",
   "SELECT DeptID, NULL FROM ALUMNI UNION SELECT DeptID, NULL FROM STUDENT;"],
  ["LAB: Set Ops", "UNION ALL with NULLs",
   "SELECT DeptID, NULL FROM ALUMNI UNION ALL SELECT DeptID, NULL FROM STUDENT;"],
  ["LAB: Set Ops", "INTERSECT with NULLs",
   "SELECT DeptID, NULL FROM ALUMNI INTERSECT SELECT DeptID, NULL FROM STUDENT;"],
  ["LAB: Set Ops", "EXCEPT with NULLs",
   "SELECT DeptID, NULL FROM DEPARTMENT EXCEPT SELECT DeptID, NULL FROM ALUMNI;"],
];

let schemaData = {};
let history = [];
let hIndex = -1;

/* ---------- terminal primitives ---------- */
function line(text, cls = "") {
  const div = document.createElement("div");
  div.className = "line " + cls;
  if (text) div.textContent = text;
  termOut.appendChild(div);
  return div;
}
function htmlLine(html, cls = "") {
  const div = document.createElement("div");
  div.className = "line " + cls;
  div.innerHTML = html;
  termOut.appendChild(div);
  return div;
}
function esc(v) {
  return String(v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function scrollBottom() { termOut.scrollTop = termOut.scrollHeight; }

function echoCommand(cmd) {
  htmlLine(`<span class="accent">SQL&gt;</span> <span class="t-cmd">${esc(cmd)}</span>`, "echo");
}

function renderTable(columns, rows) {
  const t = document.createElement("table");
  t.innerHTML =
    "<thead><tr>" + columns.map((c) => `<th>${esc(c)}</th>`).join("") + "</tr></thead>" +
    "<tbody>" + rows.map((row) =>
      "<tr>" + row.map((v) =>
        v === null ? `<td class="null">(null)</td>` : `<td>${esc(v)}</td>`).join("") +
      "</tr>").join("") + "</tbody>";
  termOut.appendChild(t);
}

function elapsed(ms) {
  const s = ms / 1000;
  return `Elapsed: 00:00:${s.toFixed(2).padStart(5, "0")}`;
}

/* ---------- command execution ---------- */
async function runSQL(sql) {
  termIn.classList.add("busy");
  try {
    const r = await fetch(API + "/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    });
    const j = await r.json();
    if (!r.ok || j.error) {
      line(j.error || "Request failed", "t-err");
      return;
    }
    if (j.kind === "query") {
      renderTable(j.columns, j.rows);
      line(`${j.rowCount} row(s) selected.` +
           (j.truncated ? ` (output limited to first ${j.rowCount} rows)` : ""), "t-muted");
      line(elapsed(j.elapsedMs), "t-muted");
    } else {
      line(j.message, "t-ok");
      line(elapsed(j.elapsedMs), "t-muted");
    }
  } catch (err) {
    line("Network error: " + err.message, "t-err");
  } finally {
    termIn.classList.remove("busy");
    scrollBottom();
  }
}

function showHelp() {
  const rows = [
    ["HELP", "show this help"],
    ["TABLES", "list all tables in the schema"],
    ["DESC <table>", "describe a table's columns"],
    ["HISTORY", "recent commands"],
    ["CLEAR", "clear the terminal  (Ctrl+L)"],
     ["<any SQL>;", "SELECT / INSERT / UPDATE / DELETE / DDL — executed live on SQLite"],
  ];
  for (const [cmd, desc] of rows)
    htmlLine(`  <span class="accent">${esc(cmd.padEnd(16))}</span><span class="t-muted">${esc(desc)}</span>`);
  line("", "");
}

function showTables() {
  const names = Object.keys(schemaData);
  if (!names.length) { line("schema not loaded yet.", "t-err"); return; }
  const width = Math.max(...names.map((n) => n.length)) + 4;
  const perRow = 3;
  for (let i = 0; i < names.length; i += perRow) {
    const chunk = names.slice(i, i + perRow)
      .map((n) => `${n.padEnd(width)}(${String(schemaData[n].columns.length)} cols)`);
    htmlLine("  " + chunk.join("").replace(/(ALUMNI|PERSON|EVENT|JOB|DONATION)/g, '<span class="accent">$1</span>') );
  }
  line(`${names.length} tables.`, "t-muted");
}

function showDesc(name) {
  const key = name.toUpperCase();
  const t = schemaData[key];
  if (!t) { line(`Unknown table: ${name}. Try TABLES first.`, "t-err"); return; }
  const rows = t.columns.map((c) => [
    c.name,
    c.type,
    t.pk.includes(c.name) ? "NOT NULL" : "NULL OK",
  ]);
  renderTable(["COLUMN", "TYPE", "CONSTRAINT"], rows);
  line(`PK: ${t.pk.join(", ")}`, "t-muted");
}

function showHistory() {
  if (!history.length) { line("no commands yet.", "t-muted"); return; }
  history.slice(-15).forEach((h, i) =>
    htmlLine(`  <span class="t-muted">${String(i + 1).padStart(3)}</span>  ${esc(h.replace(/\s+/g, " "))}`));
}

async function execute(raw) {
  const cmd = raw.trim();
  if (!cmd) return;
  echoCommand(cmd.replace(/\n+/g, " "));
  scrollBottom();

  const head = cmd.split(/\s+/)[0].toUpperCase();
  if (head === "HELP") { showHelp(); }
  else if (head === "TABLES") { showTables(); }
  else if (head === "DESC") { showDesc(cmd.split(/\s+/)[1] || ""); }
  else if (head === "HISTORY") { showHistory(); }
  else if (head === "CLEAR" || head === "CLS") { termOut.innerHTML = ""; }
  else if (head === "EXIT" || head === "QUIT") {
    line("Session persists in this tab. Close it when done.", "t-muted");
  } else {
    pushHistory(cmd);
    await runSQL(cmd);
  }
  scrollBottom();
}

function pushHistory(q) {
  if (history[history.length - 1] !== q) history.push(q);
  hIndex = history.length;
  try {
    localStorage.setItem("alumni_history", JSON.stringify(history.slice(-100)));
  } catch {}
}

/* ---------- input handling ---------- */
termIn.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const v = termIn.value;
    termIn.value = "";
    hIndex = history.length;
    execute(v);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (history.length === 0) return;
    if (hIndex === history.length) {
      // First time pressing up, go to last item
      hIndex = history.length - 1;
    } else if (hIndex > 0) {
      hIndex--;
    }
    termIn.value = history[hIndex] || "";
    // Move cursor to end of text
    setTimeout(() => { termIn.selectionStart = termIn.selectionEnd = termIn.value.length; }, 0);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (history.length === 0) return;
    if (hIndex < history.length - 1) {
      hIndex++;
      termIn.value = history[hIndex] || "";
    } else {
      hIndex = history.length;
      termIn.value = "";
    }
  } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    termOut.innerHTML = "";
  } else if (e.key === "Tab") {
    e.preventDefault();
    const v = termIn.value.toUpperCase();
    const m = v.match(/^DESC\s+(\w*)$/);
    if (m) {
      const match = Object.keys(schemaData).find((t) => t.startsWith(m[1]));
      if (match) termIn.value = "DESC " + match;
    }
  }
});

$("clearBtn").onclick = () => { termOut.innerHTML = ""; termIn.focus(); };
$("terminal").addEventListener("click", () => termIn.focus());
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); termIn.focus(); }
});

/* ---------- schema browser ---------- */
function insertAtCursor(text) {
  const s = termIn.selectionStart, e2 = termIn.selectionEnd;
  termIn.value = termIn.value.slice(0, s) + text + termIn.value.slice(e2);
  termIn.selectionStart = termIn.selectionEnd = s + text.length;
  termIn.focus();
}

function renderSchema(filter) {
  const tree = $("schemaTree");
  tree.innerHTML = "";
  const f = (filter || "").toUpperCase();
  for (const [tname, info] of Object.entries(schemaData)) {
    if (f && !tname.toUpperCase().includes(f)) continue;
    const tbl = document.createElement("div");
    tbl.className = "tbl";
    const name = document.createElement("div");
    name.className = "tbl-name";
    name.textContent = tname;
    name.onclick = () => tbl.classList.toggle("open");
    const cols = document.createElement("div");
    cols.className = "cols";
    for (const c of info.columns) {
      const col = document.createElement("div");
      col.className = "col" + (info.pk.includes(c.name) ? " pk" : "");
      col.title = `${c.name} ${c.type} — click to insert`;
      const cn = document.createElement("span"); cn.className = "cname"; cn.textContent = c.name;
      const ct = document.createElement("span"); ct.className = "ctype"; ct.textContent = " " + c.type;
      col.append(cn, ct);
      col.onclick = () => insertAtCursor(c.name);
      cols.appendChild(col);
    }
    tbl.append(name, cols);
    tree.appendChild(tbl);
  }
  if (!tree.children.length) tree.innerHTML = '<div class="t-muted">no tables match</div>';
}
$("schemaFilter").addEventListener("input", (e) => renderSchema(e.target.value));

async function loadSchema() {
  try {
    const r = await fetch(API + "/api/schema");
    schemaData = (await r.json()).tables || {};
    renderSchema("");
    const rel = document.querySelector('.counter[data-to="14"]');
    const n = Object.keys(schemaData).length;
    if (rel && n) { rel.dataset.to = n; rel.textContent = n; }
  } catch {
    $("schemaTree").innerHTML = '<div class="t-err">failed to load schema</div>';
  }
}

/* ---------- samples ---------- */
(function fillSamples() {
  const wrap = $("samplesList");
  SAMPLES.forEach(([label, sql], i) => {
    const b = document.createElement("button");
    b.className = "sample";
    const num = document.createElement("span");
    num.className = "snum";
    num.textContent = String(i + 1).padStart(2, "0");
    b.appendChild(num);
    b.appendChild(document.createTextNode(label));
    b.onclick = () => { termIn.value = sql.replace(/\n+/g, " "); execute(sql); };
    wrap.appendChild(b);
  });
})();

/* ---------- health + stats ---------- */
async function boot() {
  try {
    const [hr, sr] = await Promise.all([fetch(API + "/api/health"), fetch(API + "/api/stats")]);
    const h = await hr.json();
    const s = await sr.json();
    const pill = $("dbStatus");
    pill.className = "status-pill " + (h.ok ? "up" : "down");
    pill.innerHTML = `<span class="dot"></span>${h.ok ? (h.engine || "DATABASE") + " LIVE" : "DB DOWN"}`;

    const engine = h.engine || s.engine || "SQL Database";
    const engineText = $("engineText");
    if (engineText) engineText.textContent = engine;
    const brandSub = $("brandSub");
    if (brandSub) brandSub.textContent = engine;

    const total = (s.stats.alumni || 0) + (s.stats.students || 0) +
                  (s.stats.events || 0) + (s.stats.donations || 0);
    const rec = document.querySelector('.counter[data-to="19"]');
    if (rec && total) { rec.dataset.to = total; rec.textContent = total; }

    $("termTitle").textContent = `sqlplus — ${s.database || h.database || "connected"}`;
    htmlLine(`<span class="accent">Alumni Network SQL Console</span> — Connected`);
    htmlLine(`<span class="t-muted">Engine:</span> <span class="accent">${esc(engine)}</span> <span class="t-muted">· Database:</span> <span class="accent">${esc(h.database || "")}</span>`);
    htmlLine(`<span class="t-muted">Tracking:</span> ${s.stats.alumni} alumni · ${s.stats.students} students · ${s.stats.events} events · ${s.stats.donations} donations`);
    line("");
    htmlLine(`Type <span class="accent">HELP</span> for commands, or run any SQL. <span class="t-muted">↑/↓ history · Tab completes DESC</span>`, "t-muted");
    line("");
  } catch {
    const pill = $("dbStatus");
    pill.className = "status-pill down";
    pill.innerHTML = `<span class="dot"></span>BACKEND OFFLINE`;
    line("Backend unreachable. Is the server running?", "t-err");
  }
}

try {
  const saved = JSON.parse(localStorage.getItem("alumni_history"));
  if (Array.isArray(saved)) { history = saved; hIndex = history.length; }
} catch {}

loadSchema();
boot();

/* ---------- hero typing + counters ---------- */
(function heroFx() {
  const typed = $("typed");
  const text = "sqlplus alumni@sqlite:alumni.db";
  let i = 0;
  (function type() {
    if (i <= text.length) {
      typed.textContent = text.slice(0, i++);
      setTimeout(type, 42 + Math.random() * 46);
    }
  })();

  const counters = document.querySelectorAll(".counter");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const to = +e.target.dataset.to;
      const start = performance.now();
      (function tick(now) {
        const p = Math.min((now - start) / 1100, 1);
        e.target.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    });
  }, { threshold: 0.4 });
  counters.forEach((c) => io.observe(c));
})();
