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
      <li><strong>Prepare the surface and tool.</strong> Use only your approved non-rotating plunge-marking tool and a sacrificial spoilboard that may receive 1 mm impressions. Keep the spindle off and prevent accidental spindle start under the workshop procedure. Remove all brads, clamps, and other obstructions from the entire path.</li>
      <li><strong>Position at point 1.</strong> Home using the approved procedure, then jog to the rear-left starting mark. The current X/Y position becomes point 1; no X/Y zeroing is needed. Check there is room for +Y width, then +X length, then −Y width, with soft limits enabled and no limit overrides.</li>
      <li><strong>Set surface Z = 0.</strong> Select the work coordinate system you intend to use and show work coordinates, not Machine Coordinates. With the fitted marker and intended tool-length compensation already established, approach the sacrificial surface using fine step jogging and the approved touch-off method. At actual tip contact, use Mach3's <strong>Zero Z</strong> control only. If using paper or a touch plate, account for its thickness using the approved method; its top is not the bed surface. Do not zero machine coordinates or change the work offset/tool compensation afterward.</li>
      <li><strong>Verify clearance and depth.</strong> Confirm positive Z lifts, the bed is level across the pattern, Z +10 mm is within travel and clears everything, and Z −1 mm is an approved safe impression depth for this tool and surface. The plunge from +10 to −1 is 11 mm; the retract returns to <strong>10 mm above the surface</strong>, not 10 mm above the impression. If 10 mm cannot clear the path, do not run this program.</li>
      <li><strong>Review, then single-block.</strong> Set machine-approved feed rates below (mm/min); the defaults are examples, not validated machine settings. Review the program in Mach3 and verify its extents before running in single-block mode. Each point depresses to Z −1, then retracts to Z +10 before X/Y translation. No spindle-start command is included.</li>
      <li><strong>Finish and measure.</strong> The program ends at point 4 with Z +10 in absolute mode; it does not return to point 1. Park safely using the approved procedure, isolate motion before placing brads, and measure A (1 → 3) and B (2 → 4). Never move with brads installed. For another run, remove brads, re-home, return to point 1 and re-establish the surface Z reference as required.</li>
    </ol>
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
