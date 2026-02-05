# MySQL Setup for Windows

## Quick Installation Steps:

1. **Download MySQL Installer:**
   - Go to: https://dev.mysql.com/downloads/installer/
   - Download "mysql-installer-community-8.0.xx.x.msi"

2. **Install MySQL:**
   - Run the installer
   - Choose "Developer Default" setup
   - Set root password: `Pass123` (or update .env file)
   - Complete installation

3. **Start MySQL Service:**
   ```cmd
   net start mysql80
   ```

4. **Test Connection:**
   ```cmd
   mysql -u root -p
   ```

5. **Create Database User:**
   ```sql
   CREATE USER 'fashion_user'@'localhost' IDENTIFIED BY 'Pass123';
   GRANT ALL PRIVILEGES ON *.* TO 'fashion_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

## Alternative: Use Docker MySQL

If you prefer Docker:

```bash
docker run --name mysql-fashion -e MYSQL_ROOT_PASSWORD=Pass123 -e MYSQL_DATABASE=fashion_house -e MYSQL_USER=fashion_user -e MYSQL_PASSWORD=Pass123 -p 3306:3306 -d mysql:8.0
```