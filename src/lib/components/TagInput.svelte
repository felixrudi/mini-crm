<script lang="ts">
  import { tagColor } from '$lib/tags';

  let {
    tags = $bindable([]),
    placeholder = 'Tag … Enter'
  }: {
    tags: string[];
    placeholder?: string;
  } = $props();

  let tagInput = $state('');

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) tags = [...tags, t];
    tagInput = '';
  }

  function removeTag(t: string) {
    tags = tags.filter((x) => x !== t);
  }

  function handleTagKeydown(e: KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }
</script>

<input type="hidden" name="tags" value={tags.join(',')} />
<div
  class="flex flex-wrap gap-1.5 px-2 py-1.5 bg-cream border border-line rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-terracotta/30 focus-within:border-terracotta cursor-text"
  onclick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus(); }}
>
  {#each tags as t}
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border {tagColor(t)}">
      {t}
      <button type="button" onclick={() => removeTag(t)} class="hover:opacity-70 transition-opacity leading-none">×</button>
    </span>
  {/each}
  <input
    bind:value={tagInput}
    onkeydown={handleTagKeydown}
    type="text"
    class="flex-1 min-w-[100px] bg-transparent text-base text-ink placeholder-ink/30 focus:outline-none py-0.5"
    placeholder={tags.length === 0 ? placeholder : ''}
  />
</div>
