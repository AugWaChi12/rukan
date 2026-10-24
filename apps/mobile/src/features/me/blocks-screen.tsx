import { queryKeys } from '@rukan/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ListGroup } from '@/components/list';
import { AppText, Button, Card } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries } from '@/lib/api';
import { space } from '@/theme/tokens';
import { SubScreen } from './shared';

export function BlocksScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const blocksQuery = useQuery(queries.myBlocks());
  const unblock = useMutation({
    mutationFn: (blockId: string) => api.unblockUser(blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myBlocks }),
  });
  const blocks = blocksQuery.data ?? [];

  return (
    <SubScreen title={t('me.menu.blocks')} hint={t('me.blocksHint')}>
      {blocksQuery.isPending ? null : blocks.length === 0 ? (
        <Card style={styles.empty}>
          <AppText variant="muted" style={styles.center}>
            {t('me.blocksEmpty')}
          </AppText>
        </Card>
      ) : (
        <ListGroup>
          {blocks.map((b) => (
            <View key={b.id} style={styles.row}>
              <View style={styles.flex}>
                <AppText style={styles.name} numberOfLines={1}>
                  {b.is_anonymous
                    ? t('me.anonymousBlockedUser')
                    : (b.display_name ?? t('me.anonymousBlockedUser'))}
                </AppText>
                <AppText variant="small">{new Date(b.created_at).toLocaleDateString()}</AppText>
              </View>
              <Button
                size="sm"
                variant="ghost"
                label={t('me.unblock')}
                loading={unblock.isPending && unblock.variables === b.id}
                onPress={() => unblock.mutate(b.id)}
              />
            </View>
          ))}
        </ListGroup>
      )}
      {unblock.isError ? <AppText variant="error">{errorMessage(unblock.error)}</AppText> : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  empty: { paddingVertical: space.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  name: { fontSize: 15, fontWeight: '600' },
});
