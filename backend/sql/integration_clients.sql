CREATE TABLE IF NOT EXISTS integration_clients (
    id INT AUTO_INCREMENT PRIMARY KEY,

    client_name VARCHAR(255) NOT NULL,
    client_type ENUM('smart', 'lct', 'provider', 'other') DEFAULT 'smart',

    api_key_hash VARCHAR(255) NOT NULL,

    insurer_id VARCHAR(50) NULL,
    provider_id VARCHAR(50) NULL,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_integration_clients_type (client_type),
    INDEX idx_integration_clients_insurer_id (insurer_id),
    INDEX idx_integration_clients_provider_id (provider_id),
    INDEX idx_integration_clients_active (is_active)
);
