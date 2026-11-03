export default function NotFound() {
  return (
    <div className="notfound">
      <h1>This postcard got lost in the mail</h1>
      <p>The link may be mistyped or the card may have been removed. Ask the sender to share it again.</p>
      <a className="btn primary" href="/">Make your own postcard</a>
    </div>
  );
}
