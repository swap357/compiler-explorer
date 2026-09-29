// Copyright (c) 2026, Compiler Explorer Authors
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import type {OptPipelineResults, Pass} from '../../types/compilation/opt-pipeline-output.interfaces.js';
import type {ResultLine} from '../../types/resultline/resultline.interfaces.js';

// Numba centres headers in 120 columns; long names have no dash padding.
const passHeader = /^-*(.+?): (.+?): (BEFORE|AFTER) (\w+)-*$/;

export class NumbaPassDumpParser {
    process(output: ResultLine[]): OptPipelineResults {
        const results: OptPipelineResults = {};
        const pending: {group: string; pass: Pass}[] = [];
        let lines: ResultLine[] | undefined;

        for (const line of output) {
            const match = line.text.match(passHeader);
            if (match) {
                const [, functionName, pipeline, when, name] = match;
                const group = `${functionName} (${pipeline})`;
                if (when === 'BEFORE') {
                    const pass: Pass = {name, machine: false, before: [], after: [], irChanged: false};
                    pending.push({group, pass});
                    lines = pass.before;
                } else {
                    // Loop lifting and failed typing attempts can leave a pass without an AFTER dump.
                    const index = pending.findLastIndex(entry => entry.group === group && entry.pass.name === name);
                    const current = index < 0 ? undefined : pending.splice(index, 1)[0];
                    lines = current?.pass.after;
                    if (current) (results[group] ??= []).push(current.pass);
                }
            } else if (line.text === '' || line.text === 'func_ir is None') {
                // FunctionIR.dump() ends with a blank line, before any program output.
                lines = undefined;
            } else {
                lines?.push(line);
            }
        }

        for (const passes of Object.values(results)) {
            for (const pass of passes) {
                pass.irChanged = pass.before.map(l => l.text).join('\n') !== pass.after.map(l => l.text).join('\n');
            }
        }
        return results;
    }
}
