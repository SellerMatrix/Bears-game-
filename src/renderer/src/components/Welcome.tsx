export function Welcome({ onAdd, onSettings }: { onAdd: () => void; onSettings: () => void }) {
  return (
    <main className="welcome">
      <div className="welcome-card">
        <div className="big-mark">✉</div>
        <h1>Welcome to My Mail</h1>
        <p>All your inboxes in one calm place. Mail is sorted into People, Newsletters, Receipts and Notifications, and Claude can summarize long threads.</p>
        <ol>
          <li>Open <a href="#" onClick={(e) => { e.preventDefault(); onSettings() }}>Settings</a> and paste your Google / Microsoft app IDs (see README).</li>
          <li>Add your accounts.</li>
          <li>Optional: add an Anthropic API key for AI summaries.</li>
        </ol>
        <button className="primary big" onClick={onAdd}>Add your first account</button>
        <p className="muted small">Everything is stored on this computer only. Logins are encrypted with your system keychain.</p>
      </div>
    </main>
  )
}
