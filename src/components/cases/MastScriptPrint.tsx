"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

interface MastScriptPrintProps {
  rateName: string;
  charges: string[];
  offenses: Rec[];
  appealAuthority: string;
  appellateRightsReader: string;
  responses: Record<string, string>;
}

function ResponseLine({ value }: { value?: string }) {
  return (
    <div className="border-b border-black mt-1 mb-3 min-h-[18px] text-[10px] font-mono">
      {value || "\u00A0"}
    </div>
  );
}

export default function MastScriptPrint({
  rateName, charges, offenses, appealAuthority, appellateRightsReader, responses,
}: MastScriptPrintProps) {
  const chargeLines = charges.length > 0
    ? charges.map((c, i) => `CHARGE ${charges.length > 1 ? String.fromCharCode(73 + i) : "I"}: \u00A0VIOLATION OF THE UCMJ, ARTICLE ${c}`)
    : ["CHARGE I: \u00A0VIOLATION OF THE UCMJ, ARTICLE XX"];

  const specLines = offenses.map((o: Rec) =>
    o.offenseSummary || o.summary || ""
  ).filter(Boolean);

  return (
    <div className="bg-white text-black max-w-[8.5in] mx-auto print:max-w-none print:mx-0" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "11px", lineHeight: "1.6" }}>

      {/* ── PAGE 1 ── */}
      <div className="p-8 print:p-[0.75in]">
        <div className="text-center font-bold mb-8">OFFICE HOURS GUIDE</div>

        {/* Read charges */}
        <div className="mb-6">
          <p>CO: &nbsp;&nbsp;{rateName}, you are suspected of committing the following violation(s) of the Uniform Code of Military Justice:</p>
        </div>

        <div className="mb-2">
          {chargeLines.map((line, i) => (
            <p key={i} className="font-bold">{line}</p>
          ))}
        </div>

        {specLines.length > 0 && (
          <div className="mb-6">
            <p>Specification:</p>
            {specLines.map((spec, i) => (
              <p key={i} className="ml-4">{spec}</p>
            ))}
          </div>
        )}
        {specLines.length === 0 && (
          <div className="mb-6">
            <p>Specification:</p>
            <ResponseLine />
          </div>
        )}

        {/* Rights warning */}
        <div className="mb-6">
          <p>CO: &nbsp;&nbsp;{rateName}, you do not have to make any statement regarding the offense(s) of which you are accused or suspected, and any statement made by you may be used as evidence against you.</p>
        </div>

        {/* NJP advisement */}
        <div className="mb-6">
          <p>CO: &nbsp;&nbsp;You are advised that a nonjudicial punishment is not a trial and that a determination of misconduct on your part is not a conviction by a court. &nbsp;Further, you are advised that the formal rules of evidence used in trials by courts-martial do not apply at nonjudicial punishment.</p>
        </div>

        {/* Rights statement */}
        <div className="mb-6">
          <p>CO: &nbsp;&nbsp;I have a statement signed by you acknowledging that you were fully advised of your legal rights pertaining at this hearing.</p>
        </div>

        {/* Understand rights */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;Do you understand this statement and do you understand the rights explained therein?</p>
          <p>ACC: &nbsp;{responses.accusedUnderstandsRights ? (responses.accusedUnderstandsRights === "yes" ? "Yes" : "No") + ", sir/ma'am." : "Yes/No, sir/ma'am."}</p>
        </div>

        {/* Questions */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;Do you have any questions about them or do you wish to make any requests?</p>
          <p>ACC: &nbsp;{responses.accusedHasQuestions ? (responses.accusedHasQuestions === "yes" ? "Yes" : "No") + ", sir/ma'am." : "Yes/No, sir/ma'am."}</p>
        </div>

        <div className="border-b border-black my-6" />

        {/* Witness testimony */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;[To witness] &nbsp;What can you tell me about the accused&apos;s involvement in these offenses?</p>
          <p>WIT:</p>
          <ResponseLine value={responses.witnessTestimony} />
        </div>

      </div>

      {/* ── PAGE 2 ── */}
      <div className="p-8 print:p-[0.75in] print:break-before-page">
        {/* Witness statement change */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;If you previously provided a written statement, do you have anything to add or change in your statement?</p>
          <p>WIT:</p>
          <ResponseLine value={responses.witnessStatementChanges} />
        </div>

        {/* Cross examine */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;[To accused.] &nbsp;Would you like me to ask any further questions of these witnesses?</p>
          <p>ACC:</p>
          <ResponseLine value={responses.accusedCrossExamine} />
        </div>

        {/* Documents review */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;[After all witnesses are questioned.] &nbsp;I have before me the following documents, including statements, that will be considered by me. &nbsp;Have you been given the opportunity to examine them?</p>
          <p>ACC: &nbsp;{responses.accusedExaminedEvidence ? (responses.accusedExaminedEvidence === "yes" ? "Yes" : "No") + ", sir/ma'am." : "Yes/No, sir/ma'am."} &nbsp;(Note: &nbsp;If the answer is &quot;no,&quot; offer the accused the opportunity to examine the evidence.)</p>
        </div>

        {/* Further offer */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;Is there anything further that you wish to offer?</p>
          <p>ACC: &nbsp;{responses.accusedWishesToOffer ? (responses.accusedWishesToOffer === "yes" ? "Yes" : "No") + ", sir/ma'am." : "Yes, sir/No, sir."} &nbsp;(Note: &nbsp;If the answer is &quot;yes,&quot; permit the accused the opportunity to call his/her witness(es), make a personal statement in defense, and present other evidence.)</p>
        </div>

        {/* Other witnesses */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;Are there any other witnesses you would like to call or any other evidence you would like to present?</p>
          <p>ACC: &nbsp;{responses.accusedOtherWitnesses ? (responses.accusedOtherWitnesses === "yes" ? "Yes" : "No") + ", sir/ma'am." : "Yes, sir/No, sir."}</p>
        </div>

        {/* Mitigation */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;Is there anything that you wish to offer that would lessen the seriousness of these offenses or mitigate them?</p>
          <p>ACC:</p>
          <ResponseLine value={responses.accusedMitigation} />
        </div>

        {/* Character witness */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;[To witness.] &nbsp;What can you tell me about {rateName}&apos;s performance of duty?</p>
          <p>WIT:</p>
          <ResponseLine value={responses.characterWitnessStatement} />
        </div>

        {/* Accused final */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;[To accused.] &nbsp;Is there anything else you would like to present?</p>
          <p>ACC:</p>
          <ResponseLine value={responses.accusedFinalStatement} />
        </div>

      </div>

      {/* ── PAGE 3 ── */}
      <div className="p-8 print:p-[0.75in] print:break-before-page">
        {/* Findings */}
        <div className="mb-2">
          <p>CO: &nbsp;&nbsp;I find that you have committed the following offense(s):</p>
          <ResponseLine value={responses.findingsAnnounced} />
        </div>

        {/* Punishment */}
        <div className="mb-2 ml-12">
          <p>I impose the following punishment:</p>
          <ResponseLine value={responses.punishmentAnnounced} />
        </div>

        {/* Appeal advisement */}
        <div className="mb-2 ml-12">
          <p>You are advised that you have the right to appeal this punishment to {appealAuthority || "(enter appeal authority)"}. &nbsp;Your appeal must be submitted within a reasonable time, which is normally 5 days. Following this hearing, {appellateRightsReader || "(enter name of who reads appellate rights)"} will advise you more fully of this right to appeal. &nbsp;Do you understand?</p>
          <p>ACC:</p>
          <ResponseLine value={responses.accusedUnderstandsAppeal === "yes" ? "Yes, sir/ma'am." : responses.accusedUnderstandsAppeal === "no" ? "No, sir/ma'am." : undefined} />
        </div>

        {/* Dismissed */}
        <div className="mb-6">
          <p>CO: &nbsp;&nbsp;You are dismissed.</p>
        </div>

        <div className="text-right" style={{ marginTop: "300px" }}>Enclosure (4)</div>
      </div>
    </div>
  );
}
