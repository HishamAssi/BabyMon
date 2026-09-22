import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { api, getActiveBabyId } from "../data/apiClient.js";
import { Button } from "../components/ui/button.js";

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

  if (!babyId) return <p className="text-muted-foreground">Join a baby profile first.</p>;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Invite a caregiver</h1>
      <p className="mb-4 text-muted-foreground">
        Share this link with your spouse (or another caregiver) so they can join this baby&rsquo;s log.
      </p>
      <Button aria-label="Generate a new invite link" onClick={generate}>
        Generate invite link
      </Button>
      {link && (
        <div className="mt-3">
          <code
            role="textbox"
            aria-readonly="true"
            aria-label="Invite link to share"
            className="block break-all rounded-md bg-muted px-3 py-2 font-mono text-sm"
          >
            {link}
          </code>
          <Button
            variant="secondary"
            className="mt-2"
            aria-label="Copy invite link to clipboard"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      )}
    </div>
  );
}
