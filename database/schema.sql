CREATE DATABASE IF NOT EXISTS bd_dsapi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bd_dsapi;

CREATE TABLE IF NOT EXISTS cidades (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cidades_nome (nome)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_nome (nome)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  altura DOUBLE NOT NULL,
  nascimento DATE NOT NULL,
  cidade_id INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_clientes_cidade (cidade_id),
  CONSTRAINT fk_clientes_cidades
    FOREIGN KEY (cidade_id) REFERENCES cidades (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS produtos (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  preco DOUBLE NOT NULL,
  quantidade DOUBLE NOT NULL,
  categoria_id INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_produtos_categoria (categoria_id),
  KEY idx_produtos_quantidade (quantidade),
  CONSTRAINT fk_produtos_categorias
    FOREIGN KEY (categoria_id) REFERENCES categorias (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_produtos_preco CHECK (preco >= 0),
  CONSTRAINT chk_produtos_quantidade CHECK (quantidade >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos (
  id INT NOT NULL AUTO_INCREMENT,
  horario DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  endereco VARCHAR(200) NOT NULL,
  cliente_id INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_pedidos_cliente_horario (cliente_id, horario),
  CONSTRAINT fk_pedidos_clientes
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos_produtos (
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  preco DOUBLE NOT NULL,
  quantidade DOUBLE NOT NULL,
  PRIMARY KEY (pedido_id, produto_id),
  KEY idx_pedidos_produtos_produto (produto_id),
  CONSTRAINT fk_pedidos_produtos_pedidos
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_pedidos_produtos_produtos
    FOREIGN KEY (produto_id) REFERENCES produtos (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_pedidos_produtos_preco CHECK (preco >= 0),
  CONSTRAINT chk_pedidos_produtos_quantidade CHECK (quantidade > 0)
) ENGINE=InnoDB;
