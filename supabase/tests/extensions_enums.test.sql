begin;
select plan(13);

select has_extension('pg_cron', 'pg_cron enabled');
select has_extension('pg_net', 'pg_net enabled');
select has_extension('supabase_vault', 'vault enabled');

select has_enum('public', 'bank_code', 'enum bank_code exists');
select enum_has_labels('public', 'bank_code', array['bhd', 'banreservas', 'popular', 'apap'], 'bank_code labels mirror parsers/types.ts BankCode');

select has_enum('public', 'tx_type', 'enum tx_type exists');
select enum_has_labels('public', 'tx_type', array['card_purchase', 'card_reversal', 'atm_withdrawal', 'transfer_out'], 'tx_type labels mirror TxType');

select has_enum('public', 'currency_code', 'enum currency_code exists');
select enum_has_labels('public', 'currency_code', array['DOP', 'USD'], 'currency_code labels mirror Currency');

select enum_has_labels('public', 'mail_provider', array['gmail', 'outlook'], 'mail_provider labels');
select enum_has_labels('public', 'account_status', array['active', 'error', 'revoked', 'paused'], 'account_status labels');
select enum_has_labels('public', 'ignored_reason', array['user', 'reversed', 'unmatched_reversal'], 'ignored_reason labels');

select has_function('public', 'set_updated_at', 'set_updated_at() exists');

select * from finish();
rollback;
