const express = require("express");
const dotenv = require("dotenv");
const userRoutes = require("../routes/userRoutes");
const { Sequelize } = require("sequelize");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const sequelize = require("../config/db");

sequelize
  .authenticate()
  .then(() => console.log("Database connected successfully."))
  .catch((err) => console.error("Database connection failed:", err));

// Syncing the database
sequelize
  .sync({ alter: true })
  .then(() => console.log("Database synced."))
  .catch((err) => console.error("Error syncing database:", err));

// Checking first
app.get("/", (req, res) => {
  res.send("Welcome to the CRM Backend!");
});

// Route for Users
app.use("/api/users", userRoutes);

const authenticate = require("../middlewares/auth");
const User = require("../models/User");

app.get("/api/users", authenticate, async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  try {
    const offset = (page - 1) * limit;

    const whereClause = search
      ? {
          [Sequelize.Op.or]: [
            { name: { [Sequelize.Op.like]: `%${search}%` } },
            { email: { [Sequelize.Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const users = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
    });

    res.json({
      total: users.count,
      page: parseInt(page),
      totalPages: Math.ceil(users.count / limit),
      users: users.rows,
    });
  } catch (error) {
    console.error("Error occurred in /api/userslist:", error); // Log the error
    res.status(500).json({ message: "Internal server error." });
  }
});

// PUT route to update user details
app.put("/api/users/:id", authenticate, async (req, res) => {
  const userId = req.params.id;
  const { name, email, password } = req.body;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.password = password || user.password;

    await user.save();

    res.json({ message: "User updated successfully.", user });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// DELETE route to delete a user
app.delete("/api/users/:id", authenticate, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await user.destroy();

    res.json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
