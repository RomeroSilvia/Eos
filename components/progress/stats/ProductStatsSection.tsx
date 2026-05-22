import { Text, View } from 'react-native';
import { ProgressStateCard } from '@/components/progress/ProgressStateCard';
import type { RoutineStats } from '@/types/progress';
import {
  formatLastUsed,
  formatProductCount,
  formatUseCount,
  getCategoryLabel,
  getProductMotivationalMessage
} from '@/utils/progress';
import { RankingItem } from './RankingItem';
import { SectionTitle, SubsectionTitle } from './StatsSection';
import { StatCard } from './StatCard';
import { StatsRecommendation } from './StatsRecommendation';
import { statsStyles as styles } from './stats.styles';

type ProductStatsSectionProps = {
  stats: RoutineStats;
};

type ProductStats = RoutineStats['products'];

export function ProductStatsSection({ stats }: ProductStatsSectionProps) {
  const productStats = stats.products;
  const hasProducts =
    productStats.productRanking.length > 0 ||
    productStats.unusedProducts.length > 0 ||
    productStats.monthly.distinctProductsUsed > 0;
  const hasUses = productStats.monthly.totalProductUses > 0;

  return (
    <>
      <SectionTitle title="Productos" subtitle="Conocé qué productos usás con más frecuencia" />

      {!hasProducts ? (
        <ProgressStateCard
          icon="cube-outline"
          title="Todavía no hay productos registrados."
          text="Agregalos para mejorar el seguimiento de tu rutina."
        />
      ) : !hasUses ? (
        <>
          <ProgressStateCard
            icon="cube-outline"
            title="Tenés productos cargados, pero todavía no registraste usos en tus rutinas."
            text="Los productos empiezan a contar cuando completás pasos asociados a ellos."
          />
          <UnusedProductsSection products={productStats.unusedProducts} />
        </>
      ) : (
        <ProductStatsContent stats={stats} productStats={productStats} />
      )}
    </>
  );
}

function ProductStatsContent({ stats, productStats }: { stats: RoutineStats; productStats: ProductStats }) {
  return (
    <>
      <View style={styles.metricsGrid}>
        <StatCard
          label="Usos esta semana"
          value={String(productStats.weekly.totalProductUses)}
          detail={formatUseCount(productStats.weekly.totalProductUses)}
        />
        <StatCard
          label="Usos este mes"
          value={String(productStats.monthly.totalProductUses)}
          detail={formatUseCount(productStats.monthly.totalProductUses)}
        />
        <StatCard
          label="Productos distintos"
          value={String(productStats.monthly.distinctProductsUsed)}
          detail={formatProductCount(productStats.monthly.distinctProductsUsed)}
        />
        <StatCard
          label="Producto más usado"
          value={productStats.weekly.mostUsedProduct?.name ?? '-'}
          detail={
            productStats.weekly.mostUsedProduct
              ? `${formatUseCount(productStats.weekly.mostUsedProduct.uses)} esta semana`
              : 'Todavía no hay productos usados esta semana.'
          }
        />
      </View>

      <StatsRecommendation icon="sparkles-outline" text={getProductMotivationalMessage(stats)} />
      <ProductRankingSection products={productStats.productRanking} />
      <ProductCategorySection categories={productStats.categoryStats} />
      <ProductsByRoutineSection routines={productStats.routineProductUsage} />
      <UnusedProductsSection products={productStats.unusedProducts} />
    </>
  );
}

function ProductRankingSection({ products }: { products: ProductStats['productRanking'] }) {
  return (
    <>
      <SubsectionTitle>Productos más usados</SubsectionTitle>
      <View style={styles.rankingList}>
        {products.map((product) => (
          <RankingItem
            key={product.productId}
            title={product.name}
            meta={getCategoryLabel(product.category)}
            detail={`${formatUseCount(product.weeklyUses)} esta semana · ${formatUseCount(product.monthlyUses)} este mes`}
            value={`${product.usagePercentage}%`}
          />
        ))}
      </View>
    </>
  );
}

function ProductCategorySection({ categories }: { categories: ProductStats['categoryStats'] }) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <>
      <SubsectionTitle>Uso por categoría</SubsectionTitle>
      <View style={styles.weekList}>
        {categories.map((category) => (
          <View key={category.category} style={styles.dayRow}>
            <View style={styles.dayInfo}>
              <Text style={styles.dayLabel}>{getCategoryLabel(category.category)}</Text>
              <Text style={styles.dayStatus}>{formatUseCount(category.uses)}</Text>
            </View>
            <Text style={styles.dayPercent}>{category.percentage}%</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function ProductsByRoutineSection({ routines }: { routines: ProductStats['routineProductUsage'] }) {
  if (routines.length === 0) {
    return null;
  }

  return (
    <>
      <SubsectionTitle>Productos por rutina</SubsectionTitle>
      <View style={styles.rankingList}>
        {routines.map((routine) => (
          <View key={routine.routineId} style={styles.productRoutineCard}>
            <Text style={styles.routineName}>{routine.routineName}</Text>
            {routine.products.map((product) => (
              <View key={product.productId} style={styles.productLine}>
                <View style={styles.productDot} />
                <Text style={styles.productLineText}>
                  {product.name} · {getCategoryLabel(product.category)} · {formatUseCount(product.uses)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </>
  );
}

function UnusedProductsSection({ products }: { products: ProductStats['unusedProducts'] }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <>
      <SubsectionTitle>Productos sin uso reciente</SubsectionTitle>
      <Text style={styles.sectionHint}>Estos productos están cargados, pero no se usaron en los últimos días.</Text>
      <View style={styles.rankingList}>
        {products.map((product) => (
          <View key={product.productId} style={styles.rankingItem}>
            <View style={styles.rankingInfo}>
              <Text style={styles.routineName}>{product.name}</Text>
              <Text style={styles.routineMeta}>{getCategoryLabel(product.category)}</Text>
            </View>
            <Text style={styles.unusedText}>{formatLastUsed(product.lastUsedAt)}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
