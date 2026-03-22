"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

interface ChargeSheetPrintProps {
  data: Rec;
}

function Cell({ label, value, colSpan, className }: { label?: string; value?: string; colSpan?: number; className?: string }) {
  return (
    <td colSpan={colSpan} className={`border border-black p-1 align-top ${className || ""}`}>
      {label && <div className="text-[8px] font-bold uppercase">{label}</div>}
      <div className="text-[10px] min-h-[16px] font-mono">{value || "\u00A0"}</div>
    </td>
  );
}

function SigBlock({ nameLabel, name, orgLabel, org, gradeLabel, grade, capacityLabel, capacity }: {
  nameLabel?: string; name?: string; orgLabel?: string; org?: string;
  gradeLabel?: string; grade?: string; capacityLabel?: string; capacity?: string;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-6">
      <div className="border-b border-black pb-0.5 mb-1">
        <div className="text-[10px] font-mono min-h-[14px]">{name || "\u00A0"}</div>
        <div className="text-[8px] italic text-center">{nameLabel || "Typed Name of Officer"}</div>
      </div>
      <div className="border-b border-black pb-0.5 mb-1">
        <div className="text-[10px] font-mono min-h-[14px]">{org || "\u00A0"}</div>
        <div className="text-[8px] italic text-center">{orgLabel || "Organization of Officer"}</div>
      </div>
      <div className="border-b border-black pb-0.5 mb-1">
        <div className="text-[10px] font-mono min-h-[14px]">{grade || "\u00A0"}</div>
        <div className="text-[8px] italic text-center">{gradeLabel || "Grade"}</div>
      </div>
      {capacity !== undefined && (
        <div className="border-b border-black pb-0.5 mb-1">
          <div className="text-[10px] font-mono min-h-[14px]">{capacity || "\u00A0"}</div>
          <div className="text-[8px] italic text-center">{capacityLabel || "Official Capacity"}</div>
        </div>
      )}
      <div className="border-b border-black pb-0.5 mb-1 col-span-2 mt-1">
        <div className="min-h-[20px]">{"\u00A0"}</div>
        <div className="text-[8px] italic text-center">Signature</div>
      </div>
    </div>
  );
}

export default function ChargeSheetPrint({ data }: ChargeSheetPrintProps) {
  const charges = data.charges || [];

  return (
    <div className="bg-white text-black max-w-[8.5in] mx-auto print:max-w-none print:mx-0" style={{ fontFamily: "Times New Roman, serif" }}>
      {/* Page 1 */}
      <div className="p-6 print:p-[0.5in]">
        <div className="border-2 border-black">
          {/* Title */}
          <div className="text-center font-bold text-sm py-2 border-b-2 border-black">
            CHARGE SHEET
          </div>

          {/* I. PERSONAL DATA */}
          <div className="text-center font-bold text-[9px] py-1 border-b border-black bg-gray-50">
            I. PERSONAL DATA
          </div>

          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <Cell label="1. NAME OF ACCUSED (Last, First, Middle Initial)" value={data.accusedName} colSpan={3} />
                <Cell label="2. SSN" value={data.ssn ? `XXX-XX-${data.ssn}` : ""} />
                <Cell label="3. GRADE OR RANK" value={data.gradeOrRank} />
                <Cell label="4. PAY GRADE" value={data.payGrade} />
              </tr>
              <tr>
                <Cell label="5. UNIT OR ORGANIZATION" value={data.unitOrOrg} colSpan={3} />
                <td colSpan={3} className="border border-black p-0 align-top">
                  <div className="text-[8px] font-bold px-1 pt-1">6. CURRENT SERVICE</div>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="border-r border-black p-1">
                          <div className="text-[8px] font-bold">a. INITIAL DATE</div>
                          <div className="text-[10px] font-mono">{data.serviceInitialDate || "\u00A0"}</div>
                        </td>
                        <td className="p-1">
                          <div className="text-[8px] font-bold">b. TERM</div>
                          <div className="text-[10px] font-mono">{data.serviceTerm || "\u00A0"}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="border border-black p-0 align-top">
                  <div className="text-[8px] font-bold px-1 pt-1">7. PAY PER MONTH</div>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="border-r border-black p-1">
                          <div className="text-[8px] font-bold">a. BASIC</div>
                          <div className="text-[10px] font-mono">{data.payBasic || "\u00A0"}</div>
                        </td>
                        <td className="border-r border-black p-1">
                          <div className="text-[8px] font-bold">b. SEA/FOREIGN DUTY</div>
                          <div className="text-[10px] font-mono">{data.paySeaForeign || "\u00A0"}</div>
                        </td>
                        <td className="p-1">
                          <div className="text-[8px] font-bold">c. TOTAL</div>
                          <div className="text-[10px] font-mono">{data.payTotal || "\u00A0"}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <Cell label="8. NATURE OF RESTRAINT OF ACCUSED" value={data.natureOfRestraint} colSpan={2} />
                <Cell label="9. DATE(S) IMPOSED" value={data.datesImposed} />
              </tr>
            </tbody>
          </table>

          {/* II. CHARGES AND SPECIFICATIONS */}
          <div className="text-center font-bold text-[9px] py-1 border-t border-b border-black bg-gray-50">
            II. CHARGES AND SPECIFICATIONS
          </div>

          {charges.map((c: { article: string; specification: string }, i: number) => (
            <div key={i} className="border-b border-black">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="border-r border-black p-1 w-1/3 align-top">
                      <div className="text-[8px] font-bold">10. CHARGE{charges.length > 1 ? ` ${String.fromCharCode(73 + i)}` : ""}</div>
                      <div className="text-[10px] font-mono">{c.article ? `Violation of the UCMJ, Article ${c.article}` : "\u00A0"}</div>
                    </td>
                    <td className="p-1 align-top" colSpan={2}>
                      <div className="text-[8px] font-bold">VIOLATION OF THE UCMJ, ARTICLE</div>
                      <div className="text-[10px] font-mono">{c.article || "\u00A0"}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="p-2 border-t border-black">
                <div className="text-[8px] font-bold mb-1">SPECIFICATION</div>
                <div className="text-[10px] font-mono whitespace-pre-wrap min-h-[60px] leading-relaxed">
                  {c.specification || "\u00A0"}
                </div>
              </div>
            </div>
          ))}

          {charges.length === 0 && (
            <div className="border-b border-black p-2">
              <div className="text-[8px] font-bold">10. CHARGE</div>
              <div className="min-h-[80px]">{"\u00A0"}</div>
              <div className="text-[8px] font-bold">SPECIFICATION</div>
              <div className="min-h-[80px]">{"\u00A0"}</div>
            </div>
          )}

          {/* III. PREFERRAL */}
          <div className="text-center font-bold text-[9px] py-1 border-b border-black bg-gray-50">
            III. PREFERRAL
          </div>

          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <Cell label="11a. NAME OF ACCUSER (Last, First, Middle Initial)" value={data.accuserName} colSpan={3} />
                <Cell label="b. GRADE" value={data.accuserGrade} />
                <Cell label="c. ORGANIZATION OF ACCUSER" value={data.accuserOrg} colSpan={2} />
              </tr>
              <tr>
                <td colSpan={4} className="border border-black p-1">
                  <div className="text-[8px] font-bold">d. SIGNATURE OF ACCUSER</div>
                  <div className="min-h-[20px]">{"\u00A0"}</div>
                </td>
                <Cell label="e. DATE (YYYYMMDD)" value={data.accuserSignedDate} colSpan={2} />
              </tr>
            </tbody>
          </table>

          {/* Affidavit */}
          <div className="p-3 border-t border-black text-[10px] leading-relaxed">
            <p className="mb-2">
              <span className="font-bold">AFFIDAVIT:</span>{"    "}Before me, the undersigned, authorized by law to administer oath in cases of this character, personally
              appeared the above named accuser this _______ day of _____________ , _______ , and signed the foregoing
              charges and specifications under oath that he/she is a person subject to the Uniform Code of Military Justice and that
              he/she either has personal knowledge of or has investigated the matters set forth therein and that the same are true to
              the best of his/her knowledge and belief.
            </p>
            <SigBlock
              name={data.oathOfficerName}
              org={data.oathOfficerOrg}
              grade={data.oathOfficerGrade}
              capacity={data.oathOfficerCapacity}
              capacityLabel="Official Capacity to Administer Oath (See R.C.M. 307(b)_ must be commissioned officer)"
            />
          </div>
        </div>

        {/* Footer Page 1 */}
        <div className="flex justify-between mt-2 text-[8px]">
          <span className="font-bold">DD FORM 458, MAY 2000</span>
          <span className="text-center text-[7px]">PREVIOUS EDITION IS OBSOLETE.</span>
          <span>Page 1 of 2</span>
        </div>
      </div>

      {/* Page 2 */}
      <div className="p-6 print:p-[0.5in] print:break-before-page">
        <div className="border-2 border-black">
          {/* Item 12 */}
          <div className="p-3 border-b border-black text-[10px] leading-relaxed">
            <p className="font-bold text-[9px] mb-1">12.</p>
            <p>
              On {data.notificationDate ? formatDateLong(data.notificationDate) : "_________________ , _____________________"} , the accused was informed of the charges against him/her and of the
              name(s) of the accuser(s) known to me <span className="italic">(See R.C.M. 308(a)). (See R.C.M. 308 if notification cannot be made.)</span>
            </p>
            <SigBlock
              nameLabel="Typed Name of Immediate Commander"
              name={data.notificationCmdrName}
              orgLabel="Organization of Immediate Commander"
              org={data.notificationCmdrOrg}
              grade={data.notificationCmdrGrade}
            />
          </div>

          {/* IV. RECEIPT BY SUMMARY COURT-MARTIAL CONVENING AUTHORITY */}
          <div className="text-center font-bold text-[9px] py-1 border-b border-black bg-gray-50">
            IV. RECEIPT BY SUMMARY COURT-MARTIAL CONVENING AUTHORITY
          </div>

          <div className="p-3 border-b border-black text-[10px] leading-relaxed">
            <p className="font-bold text-[9px] mb-1">13.</p>
            <p>
              The sworn charges were received at {data.receiptTime || "_______________"} hours, {data.receiptDate ? formatDateLong(data.receiptDate) : "___________________________ , ___________________"} at
            </p>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div className="border-b border-black pb-0.5">
                <div className="text-[10px] font-mono min-h-[14px]">{data.receiptDesignation || "\u00A0"}</div>
                <div className="text-[8px] italic text-center">Designation of Command or Officer Exercising Summary Court-Martial Jurisdiction (See R.C.M. 403)</div>
              </div>
              <div className="text-[10px]">, for the</div>
            </div>
            <SigBlock
              name={data.receiptOfficerName}
              capacity={data.receiptOfficerCapacity}
              capacityLabel="Official Capacity of Officer Signing"
              grade={data.receiptOfficerGrade}
            />
          </div>

          {/* V. REFERRAL; SERVICE OF CHARGES */}
          <div className="text-center font-bold text-[9px] py-1 border-b border-black bg-gray-50">
            V. REFERRAL; SERVICE OF CHARGES
          </div>

          <table className="w-full border-collapse border-b border-black">
            <tbody>
              <tr>
                <Cell label="14a. DESIGNATION OF COMMAND OF CONVENING AUTHORITY" value={data.conveningAuthority} colSpan={3} />
                <Cell label="b. PLACE" value={data.referralPlace} />
                <Cell label="c. DATE (YYYYMMDD)" value={data.referralDate} />
              </tr>
            </tbody>
          </table>

          <div className="p-3 border-b border-black text-[10px] leading-relaxed">
            <p>
              Referred for trial to the {data.courtMartialType || "___________________"} court-martial convened by {data.referralConvenedBy || "_______________________________________________"}
            </p>
            {data.referralInstructions && (
              <p className="mt-2">, subject to the following instructions:</p>
            )}
            {data.referralInstructions && (
              <p className="mt-1 font-mono">{data.referralInstructions}</p>
            )}
            {!data.referralInstructions && (
              <div>
                <p className="mt-2">_____________________________________________ , _____________________ , subject to the following instructions:</p>
                <div className="min-h-[20px] border-b border-black mt-2">{"\u00A0"}</div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-4 text-[10px]">
              <div>
                <span>By </span>
                <span className="border-b border-black inline-block min-w-[200px] font-mono">{data.referralCommandOrOrder || "\u00A0"}</span>
                <div className="text-[8px] italic ml-8">Command or Order</div>
              </div>
              <div>
                <span>Of </span>
                <span className="border-b border-black inline-block min-w-[200px]">{"\u00A0"}</span>
              </div>
            </div>
            <SigBlock
              name={data.referralOfficerName}
              capacity={data.referralOfficerCapacity}
              capacityLabel="Official Capacity of Officer Signing"
              grade={data.referralOfficerGrade}
            />
          </div>

          {/* Item 15 */}
          <div className="p-3 text-[10px] leading-relaxed">
            <p className="font-bold text-[9px] mb-1">15.</p>
            <p>
              On {data.serviceDate ? formatDateLong(data.serviceDate) : "_________________ , _______________"} I (caused to be) served a copy hereof on (each of) the above named accused.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="border-b border-black pb-0.5">
                <div className="text-[10px] font-mono min-h-[14px]">{data.trialCounselName || "\u00A0"}</div>
                <div className="text-[8px] italic text-center">Typed Name of Trial Counsel</div>
              </div>
              <div className="border-b border-black pb-0.5">
                <div className="text-[10px] font-mono min-h-[14px]">{data.trialCounselGrade || "\u00A0"}</div>
                <div className="text-[8px] italic text-center">Grade or Rank of Trial Counsel</div>
              </div>
            </div>
            <div className="border-b border-black pb-0.5 mt-3 max-w-[50%]">
              <div className="min-h-[20px]">{"\u00A0"}</div>
              <div className="text-[8px] italic text-center">Signature</div>
            </div>
          </div>

          {/* Footnotes */}
          <div className="border-t border-black p-2 text-[7px] italic text-center">
            <p>FOOTNOTES: 1 - When an appropriate commander signs personally, inapplicable words are stricken.</p>
            <p>2 - See R.C.M. 601(e) concerning instructions.</p>
          </div>
        </div>

        {/* Footer Page 2 */}
        <div className="flex justify-between mt-2 text-[8px]">
          <span className="font-bold">DD FORM 458, MAY 2000</span>
          <span className="text-center text-[7px]">PREVIOUS EDITION IS OBSOLETE.</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    </div>
  );
}

function formatDateLong(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}
