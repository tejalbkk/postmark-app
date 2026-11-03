// The blurred-photo or colour-wash background behind a card.
export default function Backdrop({ photoURL, colors, mode, className = '', style }) {
  const c = colors && colors.length === 4 ? colors : ['#2a2340', '#c4607a', '#f29a6b', '#5b4a8a'];
  const wash = `radial-gradient(60% 50% at 12% 8%, ${c[3]} 0%, transparent 70%),radial-gradient(55% 45% at 92% 30%, ${c[2]} 0%, transparent 70%),radial-gradient(75% 55% at 40% 100%, ${c[1]} 0%, transparent 72%),${c[0]}`;
  return (
    <div className={`backdrop ${mode === 'wash' ? 'wash' : ''} ${className}`} style={style} aria-hidden="true">
      <div className="bg-photo" style={{ backgroundImage: photoURL ? `url("${photoURL}")` : 'none' }} />
      <div className="bg-wash" style={{ background: wash }} />
      <div className="bg-grain" />
      <div className="bg-shade" />
    </div>
  );
}
