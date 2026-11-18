export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-mist md:flex-row">
        <p className="font-mono">
  <img 
    src="/lock.svg" 
    alt="Envguard icon" 
    className="inline-block h-5 w-5 text-signal align-middle" 
  /> 
  <span className="align-middle">envguard</span>
</p>
<p>Built for teams who are done pasting secrets into Slack.</p>
      </div>
    </footer>
  );
}
