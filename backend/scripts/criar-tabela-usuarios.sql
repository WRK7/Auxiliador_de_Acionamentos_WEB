-- Tabela de usuários (conciliadores)
-- Execute no banco auxiliador_acionamentos: mysql -u root -p auxiliador_acionamentos < scripts/criar-tabela-usuarios.sql

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('conciliador', 'admin', 'admin_supremo') NOT NULL DEFAULT 'conciliador',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
