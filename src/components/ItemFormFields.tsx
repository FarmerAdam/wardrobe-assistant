import { StyleSheet, Text, TextInput } from 'react-native';
import { Category } from '../types';
import { ChoiceRow } from './ChoiceRow';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'jumper', label: 'Jumper' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'dress', label: 'Dress' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'accessory', label: 'Accessory' },
];

export type ItemFormValues = {
  category: Category;
  primaryColor: string;
  pattern: string;
  formality: number;
  warmth: number;
  moodTags: string;
};

export function ItemFormFields({
  values,
  onChange,
}: {
  values: ItemFormValues;
  onChange: (patch: Partial<ItemFormValues>) => void;
}) {
  return (
    <>
      <ChoiceRow
        label="Category"
        options={CATEGORY_OPTIONS}
        value={values.category}
        onChange={(category) => onChange({ category })}
      />

      <Text style={styles.label}>Primary color</Text>
      <TextInput
        style={styles.input}
        value={values.primaryColor}
        onChangeText={(primaryColor) => onChange({ primaryColor })}
        placeholder="e.g. black, olive, navy"
      />

      <ChoiceRow
        label="Pattern"
        options={[
          { value: 'solid', label: 'Solid' },
          { value: 'striped', label: 'Striped' },
          { value: 'floral', label: 'Floral' },
          { value: 'plaid', label: 'Plaid' },
          { value: 'graphic', label: 'Graphic' },
          { value: 'other', label: 'Other' },
        ]}
        value={values.pattern}
        onChange={(pattern) => onChange({ pattern })}
      />

      <ChoiceRow
        label="Formality (1 = very casual, 5 = very dressy)"
        options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
        value={values.formality}
        onChange={(formality) => onChange({ formality })}
      />

      <ChoiceRow
        label="Warmth"
        options={[
          { value: 1, label: 'Light' },
          { value: 2, label: 'Medium' },
          { value: 3, label: 'Heavy' },
        ]}
        value={values.warmth}
        onChange={(warmth) => onChange({ warmth })}
      />

      <Text style={styles.label}>Mood tags (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={values.moodTags}
        onChangeText={(moodTags) => onChange({ moodTags })}
        placeholder="e.g. cozy, confident"
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 15,
  },
});
