import { useState } from "react";
import { api, getActiveBabyId } from "../data/apiClient.js";

/** T029 — FR-003. Generates a shareable invite link for another caregiver. */
export default function InviteCaregiver() {
  const babyId = getActiveBabyId();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!babyId) return;
    const { code } = await api.post<{ code: string }>(`/invites/${babyId}`, { mode: "new_caregiver" });
    setLink(`${location.origin}/join/${code}`);
    setCopied(false);
  }

  if (!babyId) return <p>Join a baby profile first.</p>;

  return (
    <div>
      <h1>Invite a caregiver</h1>
      <p>Share this link with your spouse (or another caregiver) so they can join this baby's log.</p>
      <button aria-label="Generate a new invite link" onClick={generate}>
        Generate invite link
      </button>
      {link && (
        <div style={{ marginTop: 12 }}>
          <code
            role="textbox"
            aria-readonly="true"
            aria-label="Invite link to share"
            style={{ display: "block", padding: 8, background: "#f4f4f4", borderRadius: 6, wordBreak: "break-all" }}
          >
            {link}
          </code>
          <button
            style={{ marginTop: 8 }}
            aria-label="Copy invite link to clipboard"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
