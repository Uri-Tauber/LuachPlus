import { expect, test } from 'vitest';
import { specialMethodChoices, zmanGroup, zmanGroups } from '../src/zmanim-catalog';
import { zmanMethods } from '../src/zmanim';

test('every available time belongs to a task group, using its purpose rather than formula suffix', () => {
  for (const method of zmanMethods) {
    expect(zmanGroups.some(group => group.id === zmanGroup(method))).toBe(true);
    expect(zmanGroup(method), method).not.toBe('other');
  }
  expect(zmanGroup('getSofZmanShmaAlos16Point1ToSunset')).toBe('shema');
  expect(zmanGroup('getMinchaGedolaGRAFixedLocalChatzos30Minutes')).toBe('afternoon');
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
