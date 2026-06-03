




-- 1. Criação da Tabela DEPARTAMENTO
CREATE TABLE DEPARTAMENTO (
    ID_Departamento SERIAL PRIMARY KEY,
    Nome_Setor VARCHAR(100) NOT NULL
);

-- 2. Criação da Tabela CIDADAO
CREATE TABLE CIDADAO (
    ID_Cidadao SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    CPF VARCHAR(14) NOT NULL UNIQUE,
    Senha VARCHAR(255) NOT NULL
);

-- 3. Criação da Tabela GESTOR
CREATE TABLE GESTOR (
    ID_Gestor SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Matricula VARCHAR(50) NOT NULL UNIQUE,
    Senha VARCHAR(255) NOT NULL,
    ID_Departamento INT REFERENCES DEPARTAMENTO(ID_Departamento)
);

-- 4. Criação da Tabela OCORRENCIA
CREATE TABLE OCORRENCIA (
    ID_Ocorrencia SERIAL PRIMARY KEY,
    Categoria VARCHAR(100) NOT NULL,
    Descricao TEXT,
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    Status VARCHAR(50) DEFAULT 'Pendente',
    Indice_Criticidade INT,
    Data_Registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ID_Cidadao INT REFERENCES CIDADAO(ID_Cidadao),
    ID_Departamento INT REFERENCES DEPARTAMENTO(ID_Departamento)
);