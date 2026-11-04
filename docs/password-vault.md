# Gerenciador de senhas

Acesse Documentos → Gerenciador de senhas (`/passwords`). Cada usuário autenticado possui seu próprio cofre, sem compartilhamento.

## Configuração

1. Aplique a migração `019_password_vault.sql` pelo processo normal de migrações do ERP.
2. Configure `PASSWORD_VAULT_KEY` no ambiente do servidor: 32 bytes aleatórios representados por 64 caracteres hexadecimais. Pode gerar com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
3. Guarde uma cópia segura da chave separada do banco. Nunca versione a chave nem use prefixo `NEXT_PUBLIC_`. Reinicie o servidor após configurar.

AES-256-GCM utiliza um nonce aleatório por gravação e autentica o identificador do usuário e do registro. A chave é obrigatória, sem valor padrão. Perder ou substituir a chave impede a leitura de senhas existentes; rotação exige uma migração que decifre com a chave anterior e recifre com a nova.

A listagem retorna somente metadados. Revelar e copiar exigem uma requisição autenticada específica. Respostas usam `no-store`. Títulos, usuários e sites são metadados em texto simples. O servidor tem acesso às senhas: este cofre não implementa criptografia ponta a ponta nem senha mestra. Use HTTPS em produção. O conteúdo copiado permanece na área de transferência do dispositivo.
