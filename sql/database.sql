DROP DATABASE IF EXISTS ticketing_system;
CREATE DATABASE ticketing_system;
USE ticketing_system;

-- Create the users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mail VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user',
    auth0_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the tickets table
CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    status ENUM('open', 'closed') DEFAULT 'open',
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    agent_id INT NULL,
    updated BOOLEAN DEFAULT FALSE,
    last_update_type VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- Create the categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the attachments table
CREATE TABLE attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- Create the comments table
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default categories
INSERT INTO categories (name) VALUES
('Software'),
('Hardware'),
('Network'),
('Other');


DELIMITER //
-- Create a ticket
CREATE PROCEDURE sp_create_ticket (
    IN p_title VARCHAR(255),
    IN p_description TEXT,
    IN p_category VARCHAR(100),
    IN p_status ENUM('open', 'closed'),
    IN p_user_id INT
)
BEGIN
    INSERT INTO tickets (title, description, category, status, user_id)
    VALUES (p_title, p_description, p_category, p_status, p_user_id);

    SELECT LAST_INSERT_ID() AS ticket_id;
END //

-- Show user tickets and filters, show all tickets to admin and filters
CREATE PROCEDURE sp_get_user_tickets (
    IN p_user_id INT,
    IN p_user_role ENUM('user', 'admin', 'superadmin'),
    IN p_filter_status ENUM('open', 'closed'),
    IN p_categoryFilter VARCHAR(100),
    IN p_search TEXT,
    IN p_sort VARCHAR(100),
    IN p_order VARCHAR(10)
)
BEGIN
    SET @sql = 'SELECT t.id, t.title, t.category, COALESCE(a.name, "Unassigned") AS agent, t.status, t.updated
                FROM tickets t
                LEFT JOIN users a ON t.agent_id = a.id
                JOIN users u ON t.user_id = u.id
                WHERE 1=1';

    IF p_user_role NOT IN ('superadmin', 'admin') THEN
        SET @sql = CONCAT(@sql, ' AND t.user_id = ', p_user_id);
    END IF;

    IF p_filter_status IS NOT NULL AND p_filter_status != '' THEN
        SET @sql = CONCAT(@sql, ' AND t.status = ''', p_filter_status, '''');
    END IF;

    IF p_categoryFilter IS NOT NULL AND p_categoryFilter != '' THEN
        SET @sql = CONCAT(@sql, ' AND t.category = ''', p_categoryFilter, '''');
    END IF;

    IF p_search IS NOT NULL AND p_search != '' THEN
        SET @sql = CONCAT(@sql, ' AND (t.title LIKE ''%', p_search, '%'' OR t.description LIKE ''%', p_search, '%'')');
    END IF;

    IF p_sort IS NOT NULL AND p_order IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' ORDER BY ', p_sort, ' ', p_order);
    END IF;

    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END //

-- Create category that does not yet exist
CREATE PROCEDURE sp_create_category (
    IN p_name VARCHAR(255)
)
BEGIN
    SET p_name = TRIM(p_name);

    IF EXISTS (SELECT 1 FROM categories 
               WHERE INSTR(LOWER(p_name), LOWER(name)) > 0 
               OR INSTR(LOWER(name), LOWER(p_name)) > 0) THEN
        SELECT 'Category name conflicts with an existing category' AS message;
    ELSE
        INSERT INTO categories (name) VALUES (p_name);

        SELECT 'Category created successfully' AS message;
    END IF;
END //

DELIMITER ;
