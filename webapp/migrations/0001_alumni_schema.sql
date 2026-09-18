CREATE TABLE IF NOT EXISTS DEPARTMENT (
  DeptID INTEGER PRIMARY KEY,
  DeptName TEXT NOT NULL UNIQUE,
  DeptCode TEXT NOT NULL UNIQUE,
  HODName TEXT,
  EstablishedYear INTEGER
);
CREATE TABLE IF NOT EXISTS BATCH (
  BatchID INTEGER PRIMARY KEY,
  BatchYear INTEGER NOT NULL CHECK (BatchYear BETWEEN 1990 AND 2100),
  Section TEXT,
  TotalStudent INTEGER DEFAULT 0 CHECK (TotalStudent >= 0),
  DeptID INTEGER REFERENCES DEPARTMENT(DeptID)
);
CREATE TABLE IF NOT EXISTS COMPANY (
  CompanyID INTEGER PRIMARY KEY,
  CompanyName TEXT NOT NULL UNIQUE,
  Industry TEXT,
  CompanySize TEXT,
  Website TEXT,
  Headquarters TEXT
);
CREATE TABLE IF NOT EXISTS SKILL (
  SkillID INTEGER PRIMARY KEY,
  SkillName TEXT NOT NULL UNIQUE,
  SkillCategory TEXT,
  Description TEXT
);
CREATE TABLE IF NOT EXISTS ALUMNI (
  AlumniID INTEGER PRIMARY KEY,
  FirstName TEXT NOT NULL,
  LastName TEXT,
  Email TEXT NOT NULL UNIQUE,
  DateOfBirth TEXT,
  Address TEXT,
  DeptID INTEGER REFERENCES DEPARTMENT(DeptID),
  BatchID INTEGER REFERENCES BATCH(BatchID),
  CompanyID INTEGER REFERENCES COMPANY(CompanyID),
  CurrentPosition TEXT,
  LinkedInProfile TEXT,
  IsActive INTEGER DEFAULT 1 CHECK (IsActive IN (0, 1))
);
CREATE TABLE IF NOT EXISTS ALUMNI_PHONE (
  AlumniID INTEGER NOT NULL REFERENCES ALUMNI(AlumniID) ON DELETE CASCADE,
  PhoneNumber TEXT NOT NULL,
  PRIMARY KEY (AlumniID, PhoneNumber)
);
CREATE TABLE IF NOT EXISTS STUDENT (
  StudentID TEXT PRIMARY KEY,
  FirstName TEXT NOT NULL,
  LastName TEXT,
  DeptID INTEGER REFERENCES DEPARTMENT(DeptID),
  BatchID INTEGER REFERENCES BATCH(BatchID),
  EnrollmentYear INTEGER,
  CurrentSemester INTEGER CHECK (CurrentSemester BETWEEN 1 AND 12),
  CGPA REAL CHECK (CGPA BETWEEN 0 AND 10)
);
CREATE TABLE IF NOT EXISTS STUDENT_EMAIL (
  StudentID TEXT NOT NULL REFERENCES STUDENT(StudentID) ON DELETE CASCADE,
  Email TEXT NOT NULL,
  PRIMARY KEY (StudentID, Email)
);
CREATE TABLE IF NOT EXISTS MENTORSHIP (
  AlumniID INTEGER NOT NULL REFERENCES ALUMNI(AlumniID),
  MentorshipID TEXT NOT NULL,
  StudentID TEXT REFERENCES STUDENT(StudentID),
  StartDate TEXT,
  EndDate TEXT,
  Status TEXT DEFAULT 'Active' CHECK (Status IN ('Active', 'Completed', 'Terminated')),
  MentorshipArea TEXT,
  Goals TEXT,
  PRIMARY KEY (AlumniID, MentorshipID)
);
CREATE TABLE IF NOT EXISTS EVENT (
  EventID INTEGER PRIMARY KEY,
  EventName TEXT NOT NULL,
  EventType TEXT,
  EventDate TEXT,
  Venue TEXT,
  OrganizerID INTEGER REFERENCES ALUMNI(AlumniID)
);
CREATE TABLE IF NOT EXISTS DONATION (
  DonationID INTEGER PRIMARY KEY,
  Amount REAL CHECK (Amount > 0),
  DonationDate TEXT,
  PaymentMethod TEXT,
  DonorID INTEGER REFERENCES ALUMNI(AlumniID)
);
CREATE TABLE IF NOT EXISTS JOB (
  JobID INTEGER PRIMARY KEY,
  JobTitle TEXT NOT NULL,
  JobType TEXT,
  Salary TEXT,
  CompanyID INTEGER REFERENCES COMPANY(CompanyID),
  PostedBy INTEGER REFERENCES ALUMNI(AlumniID)
);
CREATE TABLE IF NOT EXISTS ALUMNI_SKILL (
  AlumniID INTEGER NOT NULL REFERENCES ALUMNI(AlumniID) ON DELETE CASCADE,
  SkillID INTEGER NOT NULL REFERENCES SKILL(SkillID),
  PRIMARY KEY (AlumniID, SkillID)
);
CREATE TABLE IF NOT EXISTS ALUMNI_EVENT (
  AlumniID INTEGER NOT NULL REFERENCES ALUMNI(AlumniID) ON DELETE CASCADE,
  EventID INTEGER NOT NULL REFERENCES EVENT(EventID),
  PRIMARY KEY (AlumniID, EventID)
);

CREATE INDEX IF NOT EXISTS IX_ALUMNI_DEPT ON ALUMNI(DeptID);
CREATE INDEX IF NOT EXISTS IX_ALUMNI_BATCH ON ALUMNI(BatchID);
CREATE INDEX IF NOT EXISTS IX_MNT_STUDENT ON MENTORSHIP(StudentID);
CREATE INDEX IF NOT EXISTS IX_EVENT_ORG ON EVENT(OrganizerID);
CREATE INDEX IF NOT EXISTS IX_DON_DONOR ON DONATION(DonorID);
CREATE INDEX IF NOT EXISTS IX_JOB_POSTEDBY ON JOB(PostedBy);

INSERT OR IGNORE INTO DEPARTMENT VALUES (10, 'Computer Science and Engineering', 'CSE', 'Dr. Meera Krishnan', 1985);
INSERT OR IGNORE INTO DEPARTMENT VALUES (11, 'Information Technology', 'IT', 'Dr. Rajesh Iyer', 1992);
INSERT OR IGNORE INTO DEPARTMENT VALUES (12, 'Electronics and Communication', 'ECE', 'Dr. Kavya Menon', 1988);
INSERT OR IGNORE INTO DEPARTMENT VALUES (13, 'Mechanical Engineering', 'MECH', 'Dr. Suresh Babu', 1980);
INSERT OR IGNORE INTO DEPARTMENT VALUES (14, 'Business Administration', 'MBA', 'Dr. Anita Desai', 1995);
INSERT OR IGNORE INTO BATCH VALUES (1, 2019, 'A', 60, 10);
INSERT OR IGNORE INTO BATCH VALUES (2, 2020, 'A', 55, 10);
INSERT OR IGNORE INTO BATCH VALUES (3, 2020, 'B', 58, 11);
INSERT OR IGNORE INTO BATCH VALUES (4, 2021, 'A', 62, 12);
INSERT OR IGNORE INTO BATCH VALUES (5, 2022, 'A', 50, 14);
INSERT OR IGNORE INTO COMPANY VALUES (101, 'TCS', 'IT Services', '1000+', 'https://www.tcs.com', 'Mumbai');
INSERT OR IGNORE INTO COMPANY VALUES (102, 'Infosys', 'IT Services', '1000+', 'https://www.infosys.com', 'Bengaluru');
INSERT OR IGNORE INTO COMPANY VALUES (103, 'Google', 'Technology', '1000+', 'https://www.google.com', 'Mountain View');
INSERT OR IGNORE INTO COMPANY VALUES (104, 'Reliance Industries', 'Conglomerate', '1000+', 'https://www.ril.com', 'Mumbai');
INSERT OR IGNORE INTO COMPANY VALUES (105, 'Zoho Corporation', 'Software Products', '201-1000', 'https://www.zoho.com', 'Chennai');
INSERT OR IGNORE INTO SKILL VALUES (1, 'Python', 'Programming', 'General-purpose programming language');
INSERT OR IGNORE INTO SKILL VALUES (2, 'Java', 'Programming', 'Object-oriented programming language');
INSERT OR IGNORE INTO SKILL VALUES (3, 'SQL', 'Database', 'Structured Query Language');
INSERT OR IGNORE INTO SKILL VALUES (4, 'Web Development', 'Software', 'Front-end and back-end development');
INSERT OR IGNORE INTO SKILL VALUES (5, 'Machine Learning', 'AI/ML', 'Statistical learning algorithms');
INSERT OR IGNORE INTO SKILL VALUES (6, 'Cloud Computing', 'Infrastructure', 'AWS / Azure / GCP platforms');
INSERT OR IGNORE INTO SKILL VALUES (7, 'Public Speaking', 'Soft Skill', 'Effective presentation skills');
INSERT OR IGNORE INTO SKILL VALUES (8, 'Data Analysis', 'Analytics', 'Exploratory data analysis and visualisation');
INSERT OR IGNORE INTO ALUMNI VALUES (1, 'Aarav', 'Mehta', 'aarav.mehta@gmail.com', '1997-05-12', 'Chennai, Tamil Nadu', 10, 1, 101, 'Systems Engineer', 'linkedin.com/in/aaravmehta', 1);
INSERT OR IGNORE INTO ALUMNI VALUES (2, 'Priya', 'Nair', 'priya.nair@gmail.com', '1998-09-25', 'Bengaluru, Karnataka', 10, 2, 102, 'Software Engineer', 'linkedin.com/in/priyanair', 1);
INSERT OR IGNORE INTO ALUMNI VALUES (3, 'Rohan', 'Gupta', 'rohan.gupta@gmail.com', '1997-01-30', 'Hyderabad, Telangana', 11, 3, 103, 'Data Scientist', 'linkedin.com/in/rohangupta', 1);
INSERT OR IGNORE INTO ALUMNI VALUES (4, 'Sneha', 'Iyer', 'sneha.iyer@gmail.com', '1999-03-18', 'Chennai, Tamil Nadu', 12, 4, 104, 'Business Analyst', 'linkedin.com/in/snehaiyer', 1);
INSERT OR IGNORE INTO ALUMNI VALUES (5, 'Vikram', 'Singh', 'vikram.singh@gmail.com', '1998-11-08', 'Coimbatore, Tamil Nadu', 14, 5, 105, 'Product Manager', 'linkedin.com/in/vikramsingh', 1);
INSERT OR IGNORE INTO ALUMNI_PHONE VALUES (1, '9876543210'), (1, '9876500011'), (2, '9123456780'), (3, '9988776655'), (4, '9090909090'), (5, '9843012345');
INSERT OR IGNORE INTO STUDENT VALUES ('S1001', 'Kiran', 'Raj', 10, 2, 2023, 5, 8.75);
INSERT OR IGNORE INTO STUDENT VALUES ('S1002', 'Divya', 'Sharma', 10, 2, 2023, 5, 9.10);
INSERT OR IGNORE INTO STUDENT VALUES ('S1003', 'Arjun', 'Kamath', 11, 3, 2022, 7, 8.20);
INSERT OR IGNORE INTO STUDENT VALUES ('S1004', 'Nithya', 'Ravi', 12, 4, 2022, 7, 8.95);
INSERT OR IGNORE INTO STUDENT VALUES ('S1005', 'Mohammed', 'Asif', 14, 5, 2023, 4, 8.50);
INSERT OR IGNORE INTO STUDENT_EMAIL VALUES ('S1001', 'kiran.raj@student.edu'), ('S1001', 'kiranraj@gmail.com'), ('S1002', 'divya.sharma@student.edu'), ('S1003', 'arjun.kamath@student.edu'), ('S1004', 'nithya.ravi@student.edu'), ('S1005', 'mohammed.asif@student.edu');
INSERT OR IGNORE INTO MENTORSHIP VALUES (1, 'M1', 'S1001', '2024-06-01', NULL, 'Active', 'Data Science', 'Build ML fundamentals and a capstone project');
INSERT OR IGNORE INTO MENTORSHIP VALUES (1, 'M2', 'S1002', '2024-08-15', '2025-02-15', 'Completed', 'Career Guidance', 'Internship preparation and resume review');
INSERT OR IGNORE INTO MENTORSHIP VALUES (2, 'M3', 'S1003', '2024-07-10', NULL, 'Active', 'Web Development', 'Full-stack project mentoring');
INSERT OR IGNORE INTO MENTORSHIP VALUES (3, 'M4', 'S1004', '2025-01-05', NULL, 'Active', 'Research', 'Publish a conference paper on IoT');
INSERT OR IGNORE INTO EVENT VALUES (1, 'Annual Tech Reunion 2024', 'Reunion', '2024-12-21', 'VIT Chennai Auditorium', 1);
INSERT OR IGNORE INTO EVENT VALUES (2, 'AI in Industry Workshop', 'Workshop', '2025-03-14', 'CSE Lab Complex', 2);
INSERT OR IGNORE INTO EVENT VALUES (3, 'Alumni Career Fair', 'Seminar', '2025-08-02', 'Main Grounds', 3);
INSERT OR IGNORE INTO EVENT VALUES (4, 'Entrepreneurship Talk', 'Seminar', '2025-09-20', 'MBA Block Seminar Hall', 5);
INSERT OR IGNORE INTO DONATION VALUES (1, 50000, '2024-03-15', 'Online', 1);
INSERT OR IGNORE INTO DONATION VALUES (2, 75000, '2024-01-10', 'Check', 2);
INSERT OR IGNORE INTO DONATION VALUES (3, 25000, '2024-07-22', 'UPI', 3);
INSERT OR IGNORE INTO DONATION VALUES (4, 40000, '2025-02-18', 'DD', 4);
INSERT OR IGNORE INTO DONATION VALUES (5, 60000, '2025-06-30', 'Check', 5);
INSERT OR IGNORE INTO JOB VALUES (1, 'Software Engineer Trainee', 'Full-Time', 'Rs. 6-8 LPA', 101, 1);
INSERT OR IGNORE INTO JOB VALUES (2, 'Systems Engineer', 'Full-Time', 'Rs. 7-9 LPA', 101, 2);
INSERT OR IGNORE INTO JOB VALUES (3, 'Data Analyst Intern', 'Internship', 'Rs. 30k/month', 103, 3);
INSERT OR IGNORE INTO JOB VALUES (4, 'Business Analyst', 'Full-Time', 'Rs. 12-18 LPA', 102, 4);
INSERT OR IGNORE INTO JOB VALUES (5, 'Product Management Intern', 'Internship', 'Rs. 45k/month', 105, 5);
INSERT OR IGNORE INTO ALUMNI_SKILL VALUES (1, 1), (1, 3), (1, 4), (2, 2), (2, 4), (3, 1), (3, 5);
INSERT OR IGNORE INTO ALUMNI_SKILL VALUES (3, 8), (4, 7), (4, 8), (5, 6), (5, 7);
INSERT OR IGNORE INTO ALUMNI_EVENT VALUES (1, 1), (2, 1), (3, 1), (1, 2), (2, 2);
INSERT OR IGNORE INTO ALUMNI_EVENT VALUES (3, 3), (4, 3), (5, 4);
