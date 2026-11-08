const CHAVES = {
  cidadao: { token: 'ra_token_cidadao', usuario: 'ra_usuario_cidadao' },
  gestor: { token: 'ra_token_gestor', usuario: 'ra_usuario_gestor' },
};

const ROTA_LOGIN = { cidadao: '/app/login', gestor: '/gestao/login' };

function ler(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

export const sessao = {
  token: (perfil) => ler(CHAVES[perfil].token),
  usuario: (perfil) => {
    try {
      return JSON.parse(ler(CHAVES[perfil].usuario)) || null;
    } catch {
      return null;
    }
  },
  salvar(perfil, { access_token, usuario }) {
    localStorage.setItem(CHAVES[perfil].token, access_token);
    localStorage.setItem(CHAVES[perfil].usuario, JSON.stringify(usuario));
  },
  sair(perfil) {
    localStorage.removeItem(CHAVES[perfil].token);
    localStorage.removeItem(CHAVES[perfil].usuario);
  },
};

function mensagemDeErro(dados, status) {
  const detalhe = dados?.detail;
  if (typeof detalhe === 'string') return detalhe;
  if (Array.isArray(detalhe) && detalhe.length) {
    return detalhe[0].msg.replace(/^Value error, /, '');
  }
  if (status >= 500) return 'O servidor encontrou um problema. Tente novamente.';
  return 'Não foi possível concluir a operação.';
}

async function requisicao(caminho, { metodo = 'GET', corpo, perfil, formulario } = {}) {
  const headers = {};
  const token = perfil && sessao.token(perfil);
  if (token) headers.Authorization = `Bearer ${token}`;

  let body;
  if (formulario) {
    body = formulario;
  } else if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, { method: metodo, headers, body });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique se o backend está rodando.');
  }

  const dados = await resposta.json().catch(() => null);

  if (resposta.status === 401 && token) {
    sessao.sair(perfil);
    window.location.assign(ROTA_LOGIN[perfil]);
  }
  if (resposta.status === 502 || resposta.status === 504) {
    throw new Error('Sem conexão com o servidor. Verifique se o backend está rodando.');
  }
  if (!resposta.ok) {
    const erro = new Error(mensagemDeErro(dados, resposta.status));
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

function query(params = {}) {
  const limpos = Object.entries(params).filter(([, v]) => v !== '' && v != null);
  return limpos.length ? `?${new URLSearchParams(limpos)}` : '';
}

export const api = {
  opcoes: () => requisicao('/publico/opcoes'),

  cidadao: {
    login: (cpf, senha) => requisicao('/auth/cidadao/login', { metodo: 'POST', corpo: { cpf, senha } }),
    registrar: (nome, cpf, email, senha) =>
      requisicao('/auth/cidadao/registro', { metodo: 'POST', corpo: { nome, cpf, email, senha } }),
    confirmarEmail: (cpf, codigo) =>
      requisicao('/auth/cidadao/confirmar-email', { metodo: 'POST', corpo: { cpf, codigo } }),
    reenviarCodigo: (cpf) => requisicao('/auth/cidadao/reenviar-codigo', { metodo: 'POST', corpo: { cpf } }),
    esqueciSenha: (cpf) => requisicao('/auth/cidadao/esqueci-senha', { metodo: 'POST', corpo: { cpf } }),
    redefinirSenha: (cpf, codigo, nova_senha) =>
      requisicao('/auth/cidadao/redefinir-senha', { metodo: 'POST', corpo: { cpf, codigo, nova_senha } }),
    minhas: () => requisicao('/ocorrencias/minhas', { perfil: 'cidadao' }),
    mapa: () => requisicao('/ocorrencias/minhas/mapa', { perfil: 'cidadao' }),
    detalhe: (id) => requisicao(`/ocorrencias/minhas/${id}`, { perfil: 'cidadao' }),
    registrarOcorrencia: (formulario) =>
      requisicao('/ocorrencias', { metodo: 'POST', formulario, perfil: 'cidadao' }),
  },

  gestor: {
    login: (matricula, senha) =>
      requisicao('/auth/gestor/login', { metodo: 'POST', corpo: { matricula, senha } }),
    dashboard: () => requisicao('/gestao/dashboard', { perfil: 'gestor' }),
    ocorrencias: (filtros) => requisicao(`/gestao/ocorrencias${query(filtros)}`, { perfil: 'gestor' }),
    ocorrencia: (id) => requisicao(`/gestao/ocorrencias/${id}`, { perfil: 'gestor' }),
    atualizarStatus: (id, status, observacao) =>
      requisicao(`/gestao/ocorrencias/${id}/status`, {
        metodo: 'PATCH',
        corpo: { status, observacao },
        perfil: 'gestor',
      }),
    mapa: (filtros) => requisicao(`/gestao/mapa${query(filtros)}`, { perfil: 'gestor' }),
  },
};
