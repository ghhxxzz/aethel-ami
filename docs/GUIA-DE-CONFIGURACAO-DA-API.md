# Guia de configuração da API (Groq)

O Aethel A.M.I. usa a Groq para conversar e para transformar voz em texto. A chave de acesso é um segredo: quem a tem gasta o seu limite de uso.

## 1. Criar a chave

1. Entre em **console.groq.com**, crie a conta e abra a área **API Keys**.
2. Crie uma chave e copie. Ela só aparece uma vez.
3. **Não** cole a chave em chats, prints, e-mails ou no GitHub.

## 2. Guardar a chave no seu computador

Na pasta `backend`:

```
copy .env.example .env
notepad .env
```

Troque `cole_sua_chave_aqui` pela chave, sem aspas e sem espaços. Salve e feche. O arquivo `.env` é ignorado pelo Git.

## 3. Conferir os modelos

```
cd backend
npm run models
```

Mostra os modelos que a **sua** chave enxerga. O modelo de conversa fica em `GROQ_MODEL` e o de voz em `GROQ_STT_MODEL`. Se algum não estiver na lista, troque no `.env` por um que esteja.

## 4. No Render

A chave vai em **Environment** do serviço, como variável `GROQ_API_KEY`. Nunca em arquivo do repositório. Veja `GUIA-DE-PUBLICACAO.md`.

## 5. Se a chave vazar

Apague a chave no painel da Groq, crie outra e atualize o `.env` e o Render. Se ela chegou a ir para o GitHub, considere-a perdida mesmo apagando o arquivo depois, porque o histórico do Git guarda tudo: troque a chave.

## 6. Verificação antes de enviar ao GitHub

Depois do primeiro commit, esta busca deve **não achar nada**:

```
git grep -nE "gsk_[A-Za-z0-9]{20,}"
```

## Limites e cuidados

- O backend limita 30 mensagens e 20 áudios por minuto por endereço.
- O endereço do backend publicado é aberto: quem o conhecer pode usá-lo e gastar o seu limite da Groq. Acompanhe o uso no painel da Groq. Se virar problema, o próximo passo é exigir um código de acesso no app.
