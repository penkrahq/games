import { CircleDot, Crown, Dice5, Gamepad2, Grid2X2, Grid3X3, Hash, Menu, Play, Tv } from 'lucide-react';

function Connect4Mark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="2.3" fill="currentColor"/><circle cx="16" cy="8" r="2.3" fill="currentColor"/><circle cx="8" cy="16" r="2.3" fill="currentColor"/><circle cx="16" cy="16" r="2.3" fill="currentColor"/></svg>;
}

const games = [
  { name: 'SEQUENCE', meta: '2–12 players · cards & chips', mobileMeta: '2–12 players', className: 'sequence', icon: Grid3X3, live: true, href: '/sequence/' },
  { name: 'LUDO', meta: '2–4 players · race to home', mobileMeta: '2–4 players', className: 'ludo', icon: Dice5 },
  { name: 'OWARE', meta: '2 players · seeds & pits', mobileMeta: '2 players', className: 'oware', icon: CircleDot },
  { name: 'DOMINOES', meta: '2–4 players · match the pips', mobileMeta: '2–4 players', className: 'dominoes', icon: Grid2X2 },
  { name: 'DRAUGHTS', meta: '2 players · jump & king', mobileMeta: '2 players', className: 'draughts', icon: Crown },
  { name: 'CONNECT 4', meta: '2–12 players · four in a row', mobileMeta: '2–12 players', className: 'connect4', icon: Connect4Mark, live: true, href: '/connect4/' },
];

function Wordmark() {
  return <a className="pg-wordmark" href="/" aria-label="Penkra Games home"><Gamepad2/><b>PENKRA</b><strong>GAMES</strong></a>;
}

export function Landing() {
  return <main className="pg-home">
    <header className="pg-nav"><Wordmark/><nav><a href="#games">Games</a><a href="#how">How it works</a><a href="/sequence/join">Join with code</a></nav><a className="pg-nav-play" href="/sequence/">PLAY NOW</a><button className="pg-mobile-menu" aria-label="Menu"><Menu/></button></header>
    <section className="pg-hero">
      <div className="pg-hero-copy"><span className="pg-pill"><i aria-hidden="true"/>NO SIGN-UP · FREE TO PLAY</span><h1>PLAY<br/>TOGETHER.<br/>ANY SCREEN.</h1><p className="pg-copy-desktop">Classic board &amp; card games, rebuilt for game night. Pick a game, share a code, and everyone plays from their phone — on a laptop, tablet or the TV.</p><p className="pg-copy-mobile">Classic board &amp; card games for game night. Pick a game, share a code, play from your phones.</p><div className="pg-hero-actions"><a href="/sequence/"><Play/>PLAY NOW</a><a href="/sequence/join"><Hash/>JOIN WITH CODE</a></div><div className="pg-stats"><b>6 GAMES</b><span>2 – 12 PLAYERS</span><strong>PHONE · TABLET · TV</strong></div></div>
      <div className="pg-card-stack" aria-label="Featured games"><article className="stack-card stack-yellow"><CircleDot/><small>COMING SOON</small><div><b>OWARE</b><span>2 players · seeds &amp; pits</span></div></article><article className="stack-card stack-blue"><Dice5/><small>COMING SOON</small><div><b>LUDO</b><span>2–4 players · race to home</span></div></article><article className="stack-card stack-pink"><Grid3X3/><small>PLAY NOW</small><div><b>SEQUENCE</b><span>2–12 players · cards &amp; chips</span></div></article></div>
    </section>
    <div className="pg-mobile-actions"><a href="/sequence/"><Play/>PLAY NOW</a><a href="/sequence/join"><Hash/>JOIN WITH CODE</a></div>
    <div className="pg-marquee"><span>INSERT COIN</span><i/> <span>PLAY ON ANY SCREEN</span><i/> <span>NO SIGN-UP</span><i/> <span>SHARE A CODE</span><i/> <span>UP TO 12 PLAYERS</span><i/> <span>INSERT COIN</span></div>
    <section className="pg-library" id="games"><p>THE LIBRARY</p><div className="pg-section-head"><h2>PICK YOUR GAME</h2><span>More games dropping every month.</span></div><div className="pg-game-grid">{games.map(game => { const Icon=game.icon; return <a href={game.live&&'href' in game?game.href:'#games'} className={`pg-game ${game.className}`} key={game.name} aria-disabled={!game.live}><div><Icon/><small>{game.live?'PLAY NOW':'COMING SOON'}<i>SOON</i></small></div><h3>{game.name}</h3><p><span>{game.meta}</span><i>{game.mobileMeta}</i></p></a>})}</div></section>
    <section className="pg-how" id="how"><h2>HOW IT WORKS</h2><div><article><b>01</b><Tv/><div><h3>PICK A GAME</h3><p><span>Open any game on the screen everyone can see — laptop, tablet or TV.</span><i>Open it on the screen everyone can see.</i></p></div></article><article><b>02</b><Hash/><div><h3>SHARE THE CODE</h3><p><span>Friends scan the QR or type the two-digit code on their phone. No accounts.</span><i>Friends scan the QR or type the two-digit code.</i></p></div></article><article><b>03</b><Gamepad2/><div><h3>PLAY</h3><p><span>Phones are your controllers. Cards stay private, the board stays shared.</span><i>Phones are your controllers.</i></p></div></article></div></section>
    <footer className="pg-footer"><Wordmark/><nav><a href="#games">Games</a><a href="#how">How it works</a><a href="/sequence/credits">Privacy</a></nav><small>© 2026 Penkra Games</small></footer>
  </main>;
}
