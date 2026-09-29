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

import fs from 'node:fs';

import {describe, expect, it} from 'vitest';

import {NumbaPassDumpParser} from '../lib/parsers/numba-pass-dump-parser.js';

const parser = new NumbaPassDumpParser();
const parse = (text: string) => parser.process(text.split('\n').map(text => ({text})));
const dump = (group: string, when: string, name: string, ir: string) => `${group}: ${when} ${name}\n${ir}\n\n`;

describe('Numba pass dumps', () => {
    it('pairs real Numba IR and identifies the passes that change it', () => {
        const output = parse(fs.readFileSync(new URL('numba/passes.txt', import.meta.url), 'utf8'));
        const passes = output['<dynamic>.square (nopython)'];
        expect(passes.map(pass => [pass.name, pass.irChanged])).toEqual([
            ['translate_bytecode', true],
            ['fixup_args', false],
            ['ir_processing', false],
        ]);
        expect(passes[0].before).toEqual([]);
        expect(passes[0].after[0]).toEqual({text: 'label 0:'});
        expect(passes[1].before).toEqual(passes[0].after);
        expect(passes.every(pass => !pass.machine)).toBe(true);
    });

    it('keeps nested compilation and repeated specialisations paired with their own input', () => {
        const outer = '<dynamic>.outer: nopython';
        const inner = '<dynamic>.inner: nopython';
        const output = parse(
            dump(outer, 'BEFORE', 'type_inference', 'outer before') +
                dump(inner, 'BEFORE', 'translate_bytecode', 'func_ir is None') +
                dump(inner, 'AFTER', 'translate_bytecode', 'inner IR') +
                dump(outer, 'AFTER', 'type_inference', 'outer after') +
                dump(outer, 'BEFORE', 'type_inference', 'second signature before') +
                dump(outer, 'AFTER', 'type_inference', 'second signature after'),
        );
        expect(output['<dynamic>.outer (nopython)'].map(pass => [pass.before, pass.after])).toEqual([
            [[{text: 'outer before'}], [{text: 'outer after'}]],
            [[{text: 'second signature before'}], [{text: 'second signature after'}]],
        ]);
        expect(output['<dynamic>.inner (nopython)'][0].after).toEqual([{text: 'inner IR'}]);
    });

    it.each([0, 1, 30])('accepts headers with %i padding dashes', padding => {
        const group = `<dynamic>.${'long_name_'.repeat(12)}: nopython`;
        const header = (when: string) => '-'.repeat(padding) + `${group}: ${when} fixup_args` + '-'.repeat(padding);
        const passes = Object.values(parse(`${header('BEFORE')}\nlabel 0:\n\n${header('AFTER')}\nlabel 0:\n\n`))[0];
        expect(passes).toHaveLength(1);
        expect(passes[0].irChanged).toBe(false);
    });

    it('separates pipelines and excludes program output outside IR dumps', () => {
        const output = parse(
            'program output before compilation\n' +
                dump('<dynamic>.foo: nopython', 'BEFORE', 'translate_bytecode', 'func_ir is None') +
                dump('<dynamic>.foo: nopython', 'AFTER', 'translate_bytecode', 'label 0:') +
                'program output between compilations\n' +
                dump('<dynamic>.foo: object', 'BEFORE', 'translate_bytecode', 'func_ir is None') +
                dump('<dynamic>.foo: object', 'AFTER', 'translate_bytecode', 'label 1:') +
                'program output after compilation\n',
        );
        expect(Object.keys(output)).toEqual(['<dynamic>.foo (nopython)', '<dynamic>.foo (object)']);
        expect(output['<dynamic>.foo (nopython)'][0].after).toEqual([{text: 'label 0:'}]);
        expect(output['<dynamic>.foo (object)'][0].after).toEqual([{text: 'label 1:'}]);
    });

    it('returns no passes for output without a compilation', () => {
        expect(parse('program output\n')).toEqual({});
    });

    it('omits passes interrupted by loop lifting or failed typing attempts', () => {
        const group = '<dynamic>.foo: object';
        const output = parse(
            dump(group, 'BEFORE', 'object_mode_front_end', 'outer IR') +
                dump(group, 'BEFORE', 'object_mode_front_end', 'lifted IR') +
                dump(group, 'AFTER', 'object_mode_front_end', 'lifted IR') +
                dump(group, 'BEFORE', 'ir_legalization', 'before') +
                dump(group, 'AFTER', 'ir_legalization', 'after'),
        );
        const passes = output['<dynamic>.foo (object)'];
        expect(passes.map(pass => pass.name)).toEqual(['object_mode_front_end', 'ir_legalization']);
        expect(passes[0].before).toEqual([{text: 'lifted IR'}]);
        expect(passes[0].irChanged).toBe(false);
        expect(parse(dump(group, 'AFTER', 'fixup_args', 'unpaired IR'))).toEqual({});
    });
});
