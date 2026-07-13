begin;

-- A agenda pública não precisa revelar se uma data contém pedido pendente,
-- reserva confirmada ou bloqueio administrativo. Solicitações pendentes ficam
-- invisíveis e continuam aceitando concorrência; apenas confirmação e bloqueio
-- tornam o período indisponível.

create or replace function public.get_public_weekend_availability(
  p_from date,
  p_to date
)
returns table (
  weekend_start date,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'DATE_RANGE_INVALID';
  end if;

  if p_to - p_from > 400 then
    raise exception 'DATE_RANGE_TOO_LARGE';
  end if;

  perform public.expire_pending_bookings();

  return query
  with unavailable_weekends as (
    select b.weekend_start
    from public.bookings b
    where b.weekend_start between p_from and p_to
      and b.status = 'CONFIRMED'

    union

    select bl.weekend_start
    from public.blocks bl
    where bl.weekend_start between p_from and p_to
  )
  select
    uw.weekend_start,
    'UNAVAILABLE'::text as status
  from unavailable_weekends uw
  order by uw.weekend_start;
end;
$$;

-- A página pública consulta esta RPC pelo backend usando service_role.
-- A chave anônima do navegador não pode mais executá-la diretamente.
revoke all on function public.get_public_weekend_availability(date, date)
  from public, anon, authenticated;

grant execute on function public.get_public_weekend_availability(date, date)
  to service_role;

commit;
