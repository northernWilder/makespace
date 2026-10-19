import { useEffect, useState } from 'react';
import { markingProgram } from './marking';

export default function MarkingGuide({ width, length }: { width: string; length: string }) {
  const [plungeFeed, setPlungeFeed] = useState('50');
  const [travelFeed, setTravelFeed] = useState('500');
  const [copyMessage, setCopyMessage] = useState('');
  const [copyError, setCopyError] = useState('');
  const programWidth = width.trim() && Number.isFinite(Number(width)) ? String(Number(Number(width).toFixed(3))) : width;
  const programLength = length.trim() && Number.isFinite(Number(length)) ? String(Number(Number(length).toFixed(3))) : length;
  const program = markingProgram(programWidth, programLength, plungeFeed, travelFeed);
  const code = program.status === 'valid' ? program.code : null;
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    if (code === null) {
      setDownloadUrl('');
      return;
    }
    const url = URL.createObjectURL(new Blob([`${code.replace(/\n/g, '\r\n')}\r\n`], { type: 'text/plain;charset=utf-8' }));
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [code]);

  async function copyCode() {
    setCopyMessage('');
    setCopyError('');
    if (program.status !== 'valid') return;
    try {
      await navigator.clipboard.writeText(program.code);
      setCopyMessage('Program copied. Review and verify the setup in Mach3 before running.');
    } catch (error) {
      setCopyError(`Could not copy the program: ${error instanceof Error ? error.message : String(error)}. Select and copy the displayed code manually.`);
    }
  }

  return <section className="card marking-card" aria-labelledby="marking-title">
    <div className="section-heading"><h2 id="marking-title">Mach3 · Mark the four corners</h2><span className="view-tag">NON-ROTATING MARKER</span></div>
    <p className="section-description"><strong>Axes from the front:</strong> +X toward you, −X toward the rear; +Y right, −Y left. Positive Z must lift the tool. Pattern offsets use the commanded width and length above, defaulting to 1,000 × 1,000 mm.</p>
    <p className="section-description"><strong>G-code always uses millimeters (G21).</strong> Inch measurements are converted automatically. Pattern moves are rounded to 0.001 mm. Feeds below remain in mm/min; the fixed impression depth is 1 mm and clearance is 10 mm regardless of display units.</p>
    <ol className="marking-steps">
      <li><strong>Home the machine.</strong> Press <strong>Ref All Home</strong> in Mach3 using the approved machine procedure.</li>
      <li><strong>Travel to point 1.</strong> Jog to the rear-left corner of your test pattern with the marker clear of the surface.</li>
      <li><strong>Touch off on the bed.</strong> Approach the sacrificial bed surface using the approved fine-jog touch-off method.</li>
      <li><strong>Zero the work Z height.</strong> At actual marker-tip contact with the bed surface, press <strong>Zero Z</strong>.</li>
      <li><strong>Zero the work X coordinate.</strong> Press <strong>Zero X</strong> at point 1.</li>
      <li><strong>Zero the work Y coordinate.</strong> Press <strong>Zero Y</strong> at point 1.</li>
      <li><strong>Record the test width.</strong> Enter the planned positive Y translation (point 1 → point 2) as <strong>Commanded test width</strong>.</li>
      <li><strong>Record the test length.</strong> Enter the planned positive X translation (point 2 → point 3) as <strong>Commanded test length</strong>.</li>
    </ol>
    <p className="section-description"><strong>Choose one marking method:</strong> run the generated program below, or follow the manual sequence. Both use the same width and length.</p>
    <details className="marking-program"><summary>Option A · Run the generated program</summary><ol className="marking-steps">
      <li><strong>Set the feed rates.</strong> Use machine-approved values in the fields below; the defaults are examples.</li>
      <li><strong>Download the program.</strong> Use Download G-code under Review Mach3 program.</li>
      <li><strong>Load the file in Mach3.</strong> The program assumes your current X/Y location is point 1 and work Z = 0 is the bed surface.</li>
      <li><strong>Review the toolpath extents.</strong> The path must fit within travel limits and the cleared sacrificial surface.</li>
      <li><strong>Enable Single Block.</strong> Use Mach3's single-block control for initial verification.</li>
      <li><strong>Start the reviewed program.</strong> Use Cycle Start for each block, waiting for motion to finish before continuing. It marks 1 → 2 → 3 → 4 and finishes at point 4, Z +10 mm.</li>
    </ol></details>
    <details className="marking-program"><summary>Option B · Mark the corners manually</summary><ol className="marking-steps">
      <li><strong>Mark point 1.</strong> Use the approved non-rotating marking procedure to depress to work Z −1 mm.</li>
      <li><strong>Lift to work Z +10 mm.</strong> This is 10 mm above the bed surface.</li>
      <li><strong>Travel right to point 2.</strong> Command +Y by the recorded test width.</li>
      <li><strong>Mark point 2.</strong> Depress to work Z −1 mm.</li>
      <li><strong>Lift to work Z +10 mm.</strong></li>
      <li><strong>Travel forward to point 3.</strong> Command +X by the recorded test length.</li>
      <li><strong>Mark point 3.</strong> Depress to work Z −1 mm.</li>
      <li><strong>Lift to work Z +10 mm.</strong></li>
      <li><strong>Travel left to point 4.</strong> Command −Y by the recorded test width.</li>
      <li><strong>Mark point 4.</strong> Depress to work Z −1 mm.</li>
      <li><strong>Lift to work Z +10 mm.</strong></li>
    </ol></details>
    <p className="section-description"><strong>Setup requirements:</strong> Approved non-rotating marker; spindle off with accidental start prevented; level sacrificial surface approved for 1 mm impressions; no brads or obstructions in the path; soft limits enabled. Use the intended work coordinate system, not Machine Coordinates, with tool-length compensation established. Account for paper/plate thickness during touch-off. Keep offsets and compensation unchanged after zeroing. Positive Z must lift; Z +10 must clear the entire path and fit within travel. Otherwise do not run. All manual Z values above are in mm; convert if Mach3 is displaying inches.</p>
    <div className="input-grid marking-feeds">
      <label htmlFor="plunge-feed">Marking feed (mm/min)<input id="plunge-feed" inputMode="decimal" value={plungeFeed} onChange={(event) => { setPlungeFeed(event.target.value); setCopyMessage(''); }} /></label>
      <label htmlFor="travel-feed">Retract / translation feed (mm/min)<input id="travel-feed" inputMode="decimal" value={travelFeed} onChange={(event) => { setTravelFeed(event.target.value); setCopyMessage(''); }} /></label>
    </div>
    <details className="marking-program">
      <summary>Review Mach3 program · 1 → 2 → 3 → 4</summary>
      <p className="section-description">Use as a reviewed program file, or enter motion blocks individually in MDI and wait for each to finish. Keep G90 and G91 on separate lines. This changes modes to mm, absolute positioning at the end, feed per minute, and cancels cutter compensation / canned cycles; it retains your current work offset and tool-length compensation. Check modes before subsequent work.</p>
      {program.status === 'valid' ? <><pre aria-label="Mach3 marking G-code"><code>{program.code}</code></pre><div className="form-actions"><button className="button secondary" onClick={() => void copyCode()}>Copy reviewed program</button>{downloadUrl && <a className="button secondary" href={downloadUrl} download={`cnc-squaring-${programWidth}x${programLength}mm.tap`} style={{ textDecoration: 'none' }}>Download G-code (.tap)</a>}</div></> : <p role="alert" className="message error">{program.message}</p>}
      {copyMessage && <p role="status">{copyMessage}</p>}
      {copyError && <p role="alert" className="message error">{copyError}</p>}
    </details>
  </section>;
}
