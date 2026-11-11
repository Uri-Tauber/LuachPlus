import { expect, test } from 'vitest';
import { specialMethodChoices, zmanGroup, zmanGroups } from '../src/zmanim-catalog';
import { zmanMethods } from '../src/zmanim';

test('every available time belongs to a task group, using its purpose rather than formula suffix', () => {
  for (const method of zmanMethods) {
    expect(zmanGroups.some(group => group.id === zmanGroup(method))).toBe(true);
    expect(zmanGroup(method), method).toBeDefined();
  }
  expect(zmanGroup('getSofZmanShmaAlos16Point1ToSunset')).toBe('shema');
  expect(zmanGroup('getMinchaGedolaGRAFixedLocalChatzos30Minutes')).toBe('mincha-gedola');
});
test('special-day choices use applicable time families and preserve existing custom selections', () => {
  const night = specialMethodChoices('night', 'getTzaisGeonim8Point5Degrees', zmanMethods);
  expect(night).toContain('getTzaisGeonim8Point5Degrees');
  expect(night).not.toContain('getSunrise');
  const dawn = specialMethodChoices('dawn', 'itimDawn72', zmanMethods);
  expect(dawn).toContain('getAlos72');
  expect(dawn).not.toContain('getSunset');
  expect(specialMethodChoices('night', 'getSunset', zmanMethods)).toContain('getSunset');
});

test('each time has its own family containing its different calculation methods', () => {
  expect(zmanGroup('getSunrise')).toBe('sunrise');
  expect(zmanGroup('getAlos120')).toBe(zmanGroup('itimDawn72'));
  expect(zmanGroup('getMisheyakir11Degrees')).not.toBe(zmanGroup('getAlos72'));
  expect(zmanGroup('getMinchaKetana')).not.toBe(zmanGroup('getMinchaGedola'));
  expect(zmanGroup('getPlagHamincha')).not.toBe(zmanGroup('getMinchaKetana'));
  expect(zmanGroup('getSofZmanAchilasChametzGRA')).not.toBe(zmanGroup('getSofZmanBiurChametzGRA'));
});
