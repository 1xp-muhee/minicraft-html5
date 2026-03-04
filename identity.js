export function resolveNickname() {
  const urlNick = new URLSearchParams(location.search).get('nick');
  const savedNick = localStorage.getItem('officecraft_nick');
  let nick = urlNick || savedNick || '';

  if (!nick) {
    alert('닉네임을 입력해 주세요.');
    nick = prompt('사용할 닉네임을 입력하세요', `user-${Math.floor(Math.random() * 999)}`) || '';
    nick = nick.trim() || `user-${Math.floor(Math.random() * 999)}`;
    localStorage.setItem('officecraft_nick', nick);
  }

  return nick;
}
