USE bd_dsapi;

INSERT IGNORE INTO cidades (id, nome) VALUES
  (1, 'São Paulo'),
  (2, 'Rio de Janeiro'),
  (3, 'Curitiba');

INSERT IGNORE INTO categorias (id, nome) VALUES
  (1, 'Eletrônicos'),
  (2, 'Livros'),
  (3, 'Casa e cozinha');

INSERT IGNORE INTO produtos (id, nome, preco, quantidade, categoria_id) VALUES
  (1, 'Teclado mecânico', 249.90, 15, 1),
  (2, 'Clean Code', 119.90, 8, 2),
  (3, 'Cafeteira elétrica', 189.90, 12, 3);
