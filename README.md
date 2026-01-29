# ARVYS - Project Documentation

This repository contains the source code for the ARVYS platform. The application is built as a unified Node.js application where the backend handles API requests and database interactions, while also serving the static frontend files.

---

## 🔧 Backend Architecture

The backend is built using **Node.js** and **Express**, with **MySQL** as the primary database. It follows a modular structure where configuration, routes, and server logic are separated.

### 📂 Folder Structure

- **`server.js`**: The entry point. Initializes the Express app, connects to the database, serves static files from `public/`, and mounts API routes.
- **`config/db.js`**: Handles the MySQL database connection using a connection pool for efficiency.
- **`routes/`**: Contains API route definitions.
  - `courses.js`: Handles all course-related logic (listing, details).

### 🗄️ Database

The application uses a MySQL database named `arvys`.

- **Connection**: Controlled via `config/db.js` using `mysql2`.
- **Tables**: `courses`, `course_outcomes`, `course_sections`, `course_topics`.

### 🚀 API Endpoints

The API is accessible under the `/api` prefix.

#### 1. Get All Courses

- **Endpoint**: `GET /api/courses`
- **Description**: Fetches a summary list of all available courses.
- **Response Example**:
  ```json
  [
    {
      "id": 1,
      "slug": "full-stack-web-development",
      "title": "Full Stack Web Development",
      "tagline": "Become a pro developer...",
      "description": "...",
      "created_at": "2026-01-27T16:24:37.000Z"
    }
  ]
  ```

#### 2. Get Single Course Details

- **Endpoint**: `GET /api/courses/:slug`
- **Description**: Fetches comprehensive details for a specific course, including its outcomes, curriculum (sections), and topics.
- **Parameters**: `:slug` (The unique URL-friendly identifier for the course).
- **Response Structure**:
  ```json
  {
    "id": 1,
    "slug": "full-stack-web-development",
    "title": "Full Stack Web Development",
    // ... basic course info ...
    "outcomes": [{ "id": 1, "title": "Build real-world apps..." }],
    "curriculum": [
      {
        "id": 16,
        "title": "Web Fundamentals",
        "topics": [
          { "id": 1, "title": "HTML5 Basics" },
          { "id": 2, "title": "CSS3 Styling" }
        ]
      }
    ]
  }
  ```

### ⚙️ Setup & Configuration

1.  **Environment Variables**: Create a `.env` file in the root directory:
    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=arvys
    DB_PORT=3306
    PORT=3000
    ```
2.  **Installation**:
    ```bash
    npm install
    ```
3.  **Running the Server**:
    - **Production/Standard**: `npm start` (Runs `node server.js`)
    - **Development**: `npm run dev` (Runs `nodemon server.js` for auto-restarts)

---

## 🎨 Frontend Integration

The frontend consists of static HTML, CSS, and JS files located in the `public/` folder. The Node.js server automatically serves these files.

### How to Fetch Data

The frontend should use the browser's built-in `fetch` API to retrieve data from the backend `api/` routes and dynamically populate the DOM.

#### 1. Fetching Course List (for `courses.html`)

Use this logic to populate the grid of courses.

```javascript
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/courses");
    const courses = await response.json();

    const container = document.getElementById("courses-container"); // Ensure you have this ID in your HTML

    courses.forEach((course) => {
      // Generate HTML for each course card
      const courseCard = `
                <div class="course-card">
                    <h3>${course.title}</h3>
                    <p>${course.tagline}</p>
                    <a href="course-details.html?slug=${course.slug}">View Details</a>
                </div>
            `;
      container.innerHTML += courseCard;
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
  }
});
```

#### 2. Fetching Course Details (for `course-details.html`)

Use this logic to populate the detailed view. Note how we extract the `slug` from the URL parameters to know _which_ course to fetch.

```javascript
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Get the slug from the URL (e.g., course-details.html?slug=full-stack-web)
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug");

  if (!slug) {
    console.error("No course slug provided");
    return;
  }

  try {
    // 2. Fetch data from the specifically designed API endpoint
    const response = await fetch(`/api/courses/${slug}`);

    if (!response.ok) throw new Error("Course not found");

    const course = await response.json();

    // 3. Populate Basic Info
    document.getElementById("course-title").textContent = course.title;
    document.getElementById("course-desc").textContent = course.description;

    // 4. Populate Curriculum (Nested Data)
    const curriculumContainer = document.getElementById("curriculum-list");

    course.curriculum.forEach((section) => {
      // Render Section Title
      let sectionHTML = `<div class="section"><h4>${section.title}</h4><ul>`;

      // Render Topics inside the section
      section.topics.forEach((topic) => {
        sectionHTML += `<li>${topic.title}</li>`;
      });

      sectionHTML += `</ul></div>`;
      curriculumContainer.innerHTML += sectionHTML;
    });
  } catch (error) {
    console.error("Error fetching course details:", error);
  }
});
```
