# Database Setup for EC2 Production

## Current Issue
Your backend is trying to connect to MySQL but MySQL server is not installed/running on your EC2 instance.

## Solution 1: Install MySQL on EC2 (Recommended)

### SSH into your EC2 instance and run:

```bash
# Update system
sudo apt update

# Install MySQL Server
sudo apt install mysql-server -y

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure MySQL installation
sudo mysql_secure_installation
# Choose: 
# - Set root password: Pass123
# - Remove anonymous users: Y
# - Disallow root login remotely: N (for now)
# - Remove test database: Y
# - Reload privilege tables: Y

# Create database and user
sudo mysql -u root -p
```

### In MySQL console, run:
```sql
CREATE DATABASE fashion_house CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER 'fashion_user'@'localhost' IDENTIFIED BY 'Pass123';
CREATE USER 'fashion_user'@'%' IDENTIFIED BY 'Pass123';
GRANT ALL PRIVILEGES ON fashion_house.* TO 'fashion_user'@'localhost';
GRANT ALL PRIVILEGES ON fashion_house.* TO 'fashion_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### Test connection:
```bash
mysql -u fashion_user -p fashion_house
# Enter password: Pass123
```

## Solution 2: Use Amazon RDS (Cloud Database)

If you prefer managed database:

1. **Create RDS MySQL Instance:**
   - Go to AWS RDS Console
   - Create MySQL 8.0 database
   - Choose t3.micro (free tier)
   - Set master username: `fashion_user`
   - Set master password: `Pass123`
   - Database name: `fashion_house`

2. **Update .env file:**
```env
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=3306
DB_USERNAME=fashion_user
DB_PASSWORD=Pass123
DB_DATABASE=fashion_house
NODE_ENV=production
```

## Solution 3: Development Mode (Current Setup)

For local development without MySQL:
```env
NODE_ENV=development
```

This will skip database connection and let you test other features.

## After Database Setup

1. **Update .env:**
```env
NODE_ENV=production
```

2. **Test connection:**
```bash
npm run setup-db
```

3. **Start server:**
```bash
npm run start:prod
```

## Troubleshooting

### If you get "Access denied" error:
```bash
sudo mysql -u root -p
GRANT ALL PRIVILEGES ON *.* TO 'fashion_user'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### If MySQL won't start:
```bash
sudo systemctl status mysql
sudo journalctl -u mysql
```

### Check if MySQL is listening:
```bash
sudo netstat -tlnp | grep :3306
```