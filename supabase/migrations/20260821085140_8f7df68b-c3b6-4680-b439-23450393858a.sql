insert into public.personal_blocks (profile_id, block_type, content, sort_order, alignment, is_active)
select 'ed9c16da-72a1-4a96-b8e5-ed384c1e78d1', block_type, content, 6, alignment, true
from public.personal_blocks
where id = 'c267cab5-3739-4f24-ac3b-039a065eed48'
and not exists (
  select 1 from public.personal_blocks
  where profile_id = 'ed9c16da-72a1-4a96-b8e5-ed384c1e78d1' and block_type = 'menu'
);