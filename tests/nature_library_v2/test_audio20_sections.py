"""Readable offline QA audio categories, without changing the production sound mixer."""
import importlib.util
import pathlib
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('build_audio_review',ROOT/'tools/nature_audio/build_audio_review.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class GroupedRealAudioQa(unittest.TestCase):
  def test_nature_groups_and_bilingual_names_are_visible(self):
    one={'id':'hearth_grass','file':'Dry_grass_burning_in_open_fireplace.ogg',
        'author':'ezwa','license':'PD-author',
        'license_evidence':'https://commons.wikimedia.org/wiki/File:Dry_grass_burning_in_open_fireplace.ogg',
        'category':'fire','name_ar':'نار المدفأة','name_en':'Fireplace crackle'}
    html=mod.render_html([one])
    self.assertIn('النار الطبيعية',html)
    self.assertIn('نار المدفأة',html)
    self.assertIn('Fireplace crackle',html)
    self.assertEqual(html.count('<audio '),1)
    self.assertNotIn('autoplay',html.lower())
    self.assertNotIn('<script src=',html.lower())

  def test_two_categories_without_duplication(self):
    data=[]
    for ident,file,group in [
      ('birds_early','Bird_singing.ogg','forest_birds'),
      ('rain_downpour','Rain_(1).ogg','rain_weather')
    ]:
      data.append({'id':ident,'file':file,'author':'field author','license':'PD-author',
        'license_evidence':'https://commons.wikimedia.org/wiki/File:'+file,
        'category':group,'name_ar':'صوت أصلي','name_en':'Original recording'})
    html=mod.render_html(data)
    self.assertEqual(html.count('<audio '),2)
    self.assertIn('الغابات والطيور',html)
    self.assertIn('المطر والطقس',html)
    self.assertEqual(html.count('data-sound-group='),2)
