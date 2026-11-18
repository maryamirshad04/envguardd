'use client';

export default function CommandGroup({ title, commands, note }) {
  return (
    <div className="mt-6">
      <h3 className="font-mono text-xs uppercase tracking-wider text-signal">{title}</h3>
      {note && <p className="mt-1 text-xs text-mist">{note}</p>}

      <div className="mt-3 hidden overflow-x-auto rounded-sm border border-line md:block">
        <table className="w-full text-sm">
          <tbody>
            {commands.map((c) => (
              <tr key={c.cmd} className="border-b border-line last:border-b-0 hover:bg-surface/30">
                <td className="whitespace-nowrap p-3 align-top font-mono text-paper">{c.cmd}</td>
                <td className="p-3 text-mist">{c.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 space-y-2 md:hidden">
        {commands.map((c) => (
          <li key={c.cmd} className="rounded-sm border border-line bg-surface p-3">
            <p className="break-all font-mono text-xs text-paper">{c.cmd}</p>
            <p className="mt-1 text-xs text-mist">{c.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}