function transform(input) {
  if (!input || !input.IDX_0 || !input.IDX_1) {
    throw new Error("Invalid input: IDX_0 or IDX_1 missing");
  }

  const gauge = input.IDX_0;
  const stageflow = input.IDX_1;

  // -----------------------------
  // Reduce IDX_0 (gauge metadata)
  // -----------------------------
  const reducedGauge = {
    name: gauge?.name ?? "",

    status: {
      observed: {
        primary: gauge?.status?.observed?.primary ?? null,
        primaryUnit: gauge?.status?.observed?.primaryUnit ?? "",
        secondary: gauge?.status?.observed?.secondary ?? null,
        secondaryUnit: gauge?.status?.observed?.secondaryUnit ?? ""
      },
      forecast: {
        primary: gauge?.status?.forecast?.primary ?? null,
        primaryUnit: gauge?.status?.forecast?.primaryUnit ?? "",
        secondary: gauge?.status?.forecast?.secondary ?? null,
        secondaryUnit: gauge?.status?.forecast?.secondaryUnit ?? ""
      }
    },

    flood: {
      categories: {
        action: gauge?.flood?.categories?.action?.stage != null
          ? { stage: gauge.flood.categories.action.stage }
          : undefined,

        minor: gauge?.flood?.categories?.minor?.stage != null
          ? { stage: gauge.flood.categories.minor.stage }
          : undefined,

        moderate: gauge?.flood?.categories?.moderate?.stage != null
          ? { stage: gauge.flood.categories.moderate.stage }
          : undefined,

        major: gauge?.flood?.categories?.major?.stage != null
          ? { stage: gauge.flood.categories.major.stage }
          : undefined
      }
    }
  };

  // --------------------------------
  // Helper to reduce time-series data
  // --------------------------------
  function reduceSeries(series) {
    if (!series || !Array.isArray(series.data)) {
      return { data: [] };
    }

    return {
      data: series.data
        .filter(d =>
          d &&
          d.validTime &&
          d.primary != null &&
          d.primary > -9000 // NOAA missing-data sentinel
        )
        .map(d => ({
          validTime: d.validTime,
          primary: d.primary
        }))
    };
  }

  // -------------------------------
  // Reduce IDX_1 (stage/flow series)
  // -------------------------------
  const reducedStageflow = {
    observed: {
      issuedTime: stageflow?.observed?.issuedTime ?? "",
      primaryUnits: stageflow?.observed?.primaryUnits ?? "",
      data: reduceSeries(stageflow.observed).data
    },

    forecast: {
      data: reduceSeries(stageflow.forecast).data
    }
  };

  // -------------------------------
  // Return reduced payload
  // -------------------------------
  return {
    IDX_0: reducedGauge,
    IDX_1: reducedStageflow
  };
}
