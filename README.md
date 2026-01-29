# ARVYS - Project Documentation

This repository contains the source code for the ARVYS platform. The application is a unified **Node.js** web application that uses **Express** for the backend and **EJS (Embedded JavaScript)** for Server-Side Rendering (SSR) of frontend views. It also exposes a REST API for specific data operations.

---

## 🔧 Architecture

The project adopts a hybrid approach:

1.  **Server-Side Rendering (SSR)**: Uses `EJS` templates to serve dynamic HTML pages directly from the server.
2.  **API Layer**: Exposes JSON endpoints under `/api` for data retrieval where needed.

### 📂 Folder Structure

- **`server.js`**: The entry point. Initializes Express, sets up EJS, connects to MySQL, and mounts routes.
- **`views/`**: Contains EJS template files (e.g., `index.ejs`, `about.ejs`) that correspond to the website pages.
- **`public/`**: Stores static assets like CSS, JavaScript (client-side), and Images.
- **`routes/`**:
  - `main.js`: Handles page rendering (e.g., `/`, `/about`, `/courses`).
  - `courses.js`: API endpoints for course data.
- **`config/db.js`**: Manages the MySQL database connection pool.

---

## 🗄️ Database Schema

The application relies on a **MySQL** database named `arvys`.

### Core Tables

1.  **`courses`**: Stores main course information.
    - **Columns**: `id`, `slug`, `title`, `tagline`, `description`, `duration`, `level`, **`price`** (Decimal 10,2), `created_at`.
2.  **`course_outcomes`**: Key learning outcomes for each course.
3.  **`course_sections`**: The high-level curriculum sections (modules/weeks).
4.  **`course_topics`**: Specific lessons within each section.

### ⚠️ Recent Schema Updates

- **Added `price` column**: A `DECIMAL(10,2)` column was added to the `courses` table to handle course pricing.

---

## 🚀 API Endpoints

While pages are rendered via SSR, course data is also accessible via:

- `GET /api/courses`: List all courses.
- `GET /api/courses/:slug`: Get detailed info for a single course (including outcomes and curriculum).

---

## ⚙️ Setup & Installation

1.  **Prerequisites**: Node.js and MySQL installed.
2.  **Environment Variables**: Create a `.env` file in the root:
    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=arvys
    DB_PORT=3306
    PORT=3000
    ```
3.  **Install Dependencies**:
    ```bash
    npm install
    ```
4.  **Database Setup**:
    - Import the `arvys_courses.sql` file into your MySQL instance.
    - Run the migration query to add the price column if using an older dump:
      ```sql
      ALTER TABLE `courses` ADD `price` DECIMAL(10, 2) NOT NULL DEFAULT '0.00' AFTER `level`;
      ```
5.  **Run the Server**:
    - Dev: `npm run dev`
    - Prod: `npm start`
