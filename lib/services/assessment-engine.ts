import { SurveyFamilyMember, OfficerReport, AssessmentScores } from "@/models/SurveyResponse";

export interface AssessmentConfig {
  financialThresholds: {
    category1Max: number; // ₹750
    category2Max: number; // ₹1500
    category3Max: number; // ₹2000
  };
  scoringRanges: {
    category1Range: [number, number]; // [15, 20]
    category2Range: [number, number]; // [8, 14]
    category3Range: [number, number]; // [0, 7]
  };
  dependentWeights: {
    spouse: number;
    elderlyParent: number;
    child: number;
    disabledMember: number;
    unmarriedDaughter: number;
  };
  socialStatusWeights: {
    widow: number;
    orphan: number;
    disabled: number;
    femaleHeaded: number;
    poorHousing: number;
  };
}

// Default configuration - can be overridden by admin settings
const DEFAULT_CONFIG: AssessmentConfig = {
  financialThresholds: {
    category1Max: 750,
    category2Max: 1500,
    category3Max: 2000
  },
  scoringRanges: {
    category1Range: [15, 20],
    category2Range: [8, 14],
    category3Range: [0, 7]
  },
  dependentWeights: {
    spouse: 1.0,
    elderlyParent: 1.5,
    child: 0.8,
    disabledMember: 2.0,
    unmarriedDaughter: 1.2
  },
  socialStatusWeights: {
    widow: 2.0,
    orphan: 2.5,
    disabled: 2.0,
    femaleHeaded: 1.5,
    poorHousing: 1.0
  }
};

export class AssessmentEngine {
  private config: AssessmentConfig;

  constructor(config?: Partial<AssessmentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate financial score based on per-capita income
   * Score range: 0-5 (5 being most needy)
   */
  calculateFinancialScore(totalIncome: number, totalExpenses: number, familySize: number): number {
    if (familySize <= 0) return 0;
    
    const perCapitaIncome = (totalIncome - totalExpenses) / familySize;
    
    // Score based on per-capita income thresholds
    if (perCapitaIncome <= 500) return 5;
    if (perCapitaIncome <= 750) return 4;
    if (perCapitaIncome <= 1000) return 3;
    if (perCapitaIncome <= 1500) return 2;
    if (perCapitaIncome <= 2000) return 1;
    return 0;
  }

  /**
   * Calculate dependents score based on number and type of dependents
   * Score range: 0-5 (5 being most dependents)
   */
  calculateDependentsScore(familyMembers: SurveyFamilyMember[]): number {
    let dependentWeight = 0;
    
    familyMembers.forEach(member => {
      if (!member.isDependent) return;
      
      // Apply weights based on relationship and condition
      if (member.relationship.toLowerCase().includes('spouse') || member.relationship.toLowerCase().includes('wife')) {
        dependentWeight += this.config.dependentWeights.spouse;
      } else if (member.relationship.toLowerCase().includes('father') || member.relationship.toLowerCase().includes('mother')) {
        dependentWeight += this.config.dependentWeights.elderlyParent;
      } else if (member.relationship.toLowerCase().includes('son') || member.relationship.toLowerCase().includes('daughter')) {
        dependentWeight += this.config.dependentWeights.child;
      }
      
      // Additional weight for disabled members
      if (member.hasDisability) {
        dependentWeight += this.config.dependentWeights.disabledMember;
      }
      
      // Additional weight for unmarried daughters
      if (member.relationship.toLowerCase().includes('daughter') && 
          (member.maritalStatus === 'single' || member.maritalStatus === 'divorced')) {
        dependentWeight += this.config.dependentWeights.unmarriedDaughter;
      }
    });
    
    // Convert weight to score (0-5)
    if (dependentWeight >= 8) return 5;
    if (dependentWeight >= 6) return 4;
    if (dependentWeight >= 4) return 3;
    if (dependentWeight >= 2) return 2;
    if (dependentWeight >= 1) return 1;
    return 0;
  }

  /**
   * Calculate social status score based on vulnerability factors
   * Score range: 0-5 (5 being most vulnerable)
   */
  calculateSocialStatusScore(
    familyMembers: SurveyFamilyMember[],
    housingCondition: string,
    isWidowHeaded: boolean = false
  ): number {
    let socialWeight = 0;
    
    // Check for widow-headed household
    if (isWidowHeaded) {
      socialWeight += this.config.socialStatusWeights.widow;
    }
    
    // Check for orphans (children without parents)
    const hasOrphans = familyMembers.some(member => 
      (member.relationship.toLowerCase().includes('son') || member.relationship.toLowerCase().includes('daughter')) &&
      member.age < 18 &&
      !familyMembers.some(parent => 
        parent.relationship.toLowerCase().includes('father') || parent.relationship.toLowerCase().includes('mother')
      )
    );
    if (hasOrphans) {
      socialWeight += this.config.socialStatusWeights.orphan;
    }
    
    // Check for disabled members
    const disabledCount = familyMembers.filter(member => member.hasDisability).length;
    socialWeight += disabledCount * this.config.socialStatusWeights.disabled;
    
    // Check for female-headed household (no adult male earners)
    const adultMaleEarners = familyMembers.filter(member => 
      member.age >= 18 && 
      member.monthlyIncome > 0 &&
      !member.relationship.toLowerCase().includes('wife') &&
      !member.relationship.toLowerCase().includes('daughter')
    ).length;
    
    if (adultMaleEarners === 0) {
      socialWeight += this.config.socialStatusWeights.femaleHeaded;
    }
    
    // Check housing condition
    if (housingCondition === 'poor' || housingCondition === 'very_poor') {
      socialWeight += this.config.socialStatusWeights.poorHousing;
    }
    
    // Convert weight to score (0-5)
    if (socialWeight >= 8) return 5;
    if (socialWeight >= 6) return 4;
    if (socialWeight >= 4) return 3;
    if (socialWeight >= 2) return 2;
    if (socialWeight >= 1) return 1;
    return 0;
  }

  /**
   * Use officer report score directly (already 0-5 scale)
   */
  calculateOfficerScore(officerReport: OfficerReport): number {
    return Math.max(0, Math.min(5, officerReport.officerScore));
  }

  /**
   * Determine beneficiary category based on total score
   */
  determineCategory(totalScore: number): {
    category: 'category_1' | 'category_2' | 'category_3';
    categoryColor: 'white' | 'yellow' | 'green';
  } {
    const { category1Range, category2Range, category3Range } = this.config.scoringRanges;
    
    if (totalScore >= category1Range[0] && totalScore <= category1Range[1]) {
      return { category: 'category_1', categoryColor: 'white' };
    } else if (totalScore >= category2Range[0] && totalScore <= category2Range[1]) {
      return { category: 'category_2', categoryColor: 'yellow' };
    } else {
      return { category: 'category_3', categoryColor: 'green' };
    }
  }

  /**
   * Get eligible facilities based on category
   */
  getEligibleFacilities(category: 'category_1' | 'category_2' | 'category_3'): string[] {
    const facilityMappings = {
      'category_1': [
        'Full sponsorship and monthly stipends',
        'Priority medical aid and free medicines',
        'Education support and school fees',
        'Monthly ration support',
        'Widow/disability pension assistance',
        'Emergency financial assistance'
      ],
      'category_2': [
        'Partial sponsorship and targeted support',
        'Subsidized medical treatment',
        'Partial education support',
        'Crisis-based emergency aid'
      ],
      'category_3': [
        'Emergency aid in verified crises',
        'Skill development programs',
        'Government scheme guidance'
      ]
    };
    
    return facilityMappings[category] || [];
  }

  /**
   * Calculate complete assessment scores
   */
  calculateAssessment(
    totalIncome: number,
    totalExpenses: number,
    familySize: number,
    familyMembers: SurveyFamilyMember[],
    housingCondition: string,
    officerReport: OfficerReport,
    isWidowHeaded: boolean = false
  ): AssessmentScores {
    const financialScore = this.calculateFinancialScore(totalIncome, totalExpenses, familySize);
    const dependentsScore = this.calculateDependentsScore(familyMembers);
    const socialStatusScore = this.calculateSocialStatusScore(familyMembers, housingCondition, isWidowHeaded);
    const officerScore = this.calculateOfficerScore(officerReport);
    
    const totalScore = financialScore + dependentsScore + socialStatusScore + officerScore;
    const { category, categoryColor } = this.determineCategory(totalScore);
    const perCapitaIncome = familySize > 0 ? (totalIncome - totalExpenses) / familySize : 0;
    
    return {
      financialScore,
      dependentsScore,
      socialStatusScore,
      officerScore,
      totalScore,
      category,
      categoryColor,
      perCapitaIncome,
      calculatedAt: new Date()
    };
  }

  /**
   * Update assessment configuration (for admin use)
   */
  updateConfig(newConfig: Partial<AssessmentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AssessmentConfig {
    return { ...this.config };
  }

  /**
   * Validate assessment data before calculation
   */
  validateAssessmentData(
    totalIncome: number,
    totalExpenses: number,
    familySize: number,
    familyMembers: SurveyFamilyMember[],
    officerReport: OfficerReport
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (totalIncome < 0) errors.push('Total income cannot be negative');
    if (totalExpenses < 0) errors.push('Total expenses cannot be negative');
    if (familySize <= 0) errors.push('Family size must be greater than 0');
    if (familyMembers.length === 0) errors.push('At least one family member is required');
    if (officerReport.officerScore < 0 || officerReport.officerScore > 5) {
      errors.push('Officer score must be between 0 and 5');
    }
    
    // Validate family members data
    familyMembers.forEach((member, index) => {
      if (!member.name || member.name.trim() === '') {
        errors.push(`Family member ${index + 1}: Name is required`);
      }
      if (member.age < 0 || member.age > 120) {
        errors.push(`Family member ${index + 1}: Age must be between 0 and 120`);
      }
      if (member.monthlyIncome < 0) {
        errors.push(`Family member ${index + 1}: Monthly income cannot be negative`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const assessmentEngine = new AssessmentEngine();

// Export for testing with custom config
export { DEFAULT_CONFIG };