import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import SurveyResponse from '@/models/SurveyResponse';
import FamilyMember from '@/models/FamilyMember';

export async function GET(
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findOne({ clerkUserId: userId });
    
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get survey with populated data
    const survey = await SurveyResponse.findById((await params).surveyId)
      .populate('requestId')
      .populate('officerId', 'name email')
      .populate('approvedBy', 'name')
      .lean() as any;

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Get family members
    const familyMembers = await FamilyMember.find({ surveyId: survey._id })
      .sort({ memberIndex: 1 })
      .lean() as any[];

    // Generate report data
    const reportData = {
      survey: {
        id: survey.surveyId,
        status: survey.status,
        category: survey.category,
        submittedAt: survey.submittedAt,
        approvedAt: survey.approvedAt,
        approvedBy: survey.approvedBy?.name
      },
      applicant: {
        name: survey.personalDetails.fullName,
        fatherName: survey.personalDetails.fatherName,
        contact: survey.personalDetails.contactNumber,
        address: survey.personalDetails.fullAddress,
        district: survey.personalDetails.district,
        pinCode: survey.personalDetails.pinCode
      },
      officer: {
        name: survey.officerId?.name,
        email: survey.officerId?.email,
        recommendation: survey.officerReport.officerRecommendation,
        score: survey.officerReport.officerScore,
        verificationStatus: survey.officerReport.verificationStatus
      },
      family: {
        totalMembers: familyMembers.length,
        children: familyMembers.filter(m => m.age < 18).length,
        elderly: familyMembers.filter(m => m.age > 60).length,
        disabled: familyMembers.filter(m => m.hasDisability).length,
        employed: familyMembers.filter(m => m.employmentStatus === 'employed').length,
        members: familyMembers.map(member => ({
          name: member.name,
          age: member.age,
          relationship: member.relationship,
          education: member.educationLevel,
          occupation: member.occupation,
          monthlyIncome: member.monthlyIncome,
          healthStatus: member.healthStatus,
          employmentStatus: member.employmentStatus,
          sponsorshipAvailable: member.sponsorship?.availableForSponsorship,
          sponsorshipCategory: member.sponsorship?.category,
          memberHumanId: member.sponsorship?.memberHumanId
        }))
      },
      financial: {
        totalEarnings: survey.incomeExpenses.monthlyEarnings.totalEarnings,
        totalExpenses: survey.incomeExpenses.monthlyExpenses.totalExpenses,
        netAmount: survey.incomeExpenses.netAmount,
        perCapitaIncome: survey.calculatedScores?.perCapitaIncome
      },
      housing: {
        type: survey.housingDetails.houseType,
        condition: survey.housingDetails.housingCondition,
        waterConnection: survey.housingDetails.waterConnection,
        electricityConnection: survey.housingDetails.electricityConnection,
        gasConnection: survey.housingDetails.gasConnection,
        toiletFacility: survey.housingDetails.toiletFacility
      },
      assessment: survey.calculatedScores ? {
        financialScore: survey.calculatedScores.financialScore || 0,
        dependentsScore: survey.calculatedScores.dependentsScore || 0,
        socialStatusScore: survey.calculatedScores.socialStatusScore || 0,
        officerScore: survey.calculatedScores.officerScore || 0,
        totalScore: survey.calculatedScores.totalScore || 0,
        category: survey.calculatedScores.category || 'not_assessed',
        categoryColor: survey.calculatedScores.categoryColor || 'white'
      } : null,
      reliefCard: survey.reliefCard ? {
        cardId: survey.reliefCard.cardId,
        assignedAt: survey.reliefCard.assignedAt,
        status: survey.reliefCard.status
      } : null,
      sponsorshipSummary: {
        totalAvailable: familyMembers.filter(m => m.sponsorship?.availableForSponsorship).length,
        categories: familyMembers.reduce((acc: any, member: any) => {
          if (member.sponsorship?.availableForSponsorship && member.sponsorship?.category) {
            acc[member.sponsorship.category] = (acc[member.sponsorship.category] || 0) + 1;
          }
          return acc;
        }, {}),
        totalMonthlyRequirement: familyMembers
          .filter(m => m.sponsorship?.availableForSponsorship)
          .reduce((sum, m) => sum + (m.sponsorship?.monthlyAmount || 0), 0)
      }
    };

    // Generate HTML report
    const htmlReport = generateHTMLReport(reportData);

    return new NextResponse(htmlReport, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="survey-report-${survey.surveyId}.html"`
      }
    });

  } catch (error) {
    console.error('Error generating survey report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateHTMLReport(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Survey Report - ${data.survey.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .status { padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; }
        .status.verified { background-color: #22c55e; }
        .status.submitted { background-color: #3b82f6; }
        .status.rejected { background-color: #ef4444; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .score { font-size: 1.2em; font-weight: bold; color: #333; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>Khadim-e-Millat Welfare Foundation</h1>
        <h2>Survey Assessment Report</h2>
        <p><strong>Survey ID:</strong> ${data.survey.id}</p>
        <p><strong>Status:</strong> <span class="status ${data.survey.status}">${data.survey.status.toUpperCase()}</span></p>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="section">
        <h2>Applicant Information</h2>
        <div class="grid">
            <div class="card">
                <h3>Personal Details</h3>
                <p><strong>Name:</strong> ${data.applicant.name}</p>
                <p><strong>Father's Name:</strong> ${data.applicant.fatherName}</p>
                <p><strong>Contact:</strong> ${data.applicant.contact}</p>
                <p><strong>District:</strong> ${data.applicant.district}</p>
                <p><strong>PIN Code:</strong> ${data.applicant.pinCode}</p>
            </div>
            <div class="card">
                <h3>Address</h3>
                <p>${data.applicant.address}</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Family Composition</h2>
        <div class="grid">
            <div class="card">
                <h3>Family Statistics</h3>
                <p><strong>Total Members:</strong> ${data.family.totalMembers}</p>
                <p><strong>Children (< 18):</strong> ${data.family.children}</p>
                <p><strong>Elderly (> 60):</strong> ${data.family.elderly}</p>
                <p><strong>Disabled:</strong> ${data.family.disabled}</p>
                <p><strong>Employed:</strong> ${data.family.employed}</p>
            </div>
            <div class="card">
                <h3>Financial Summary</h3>
                <p><strong>Total Monthly Earnings:</strong> ₹${data.financial.totalEarnings}</p>
                <p><strong>Total Monthly Expenses:</strong> ₹${data.financial.totalExpenses}</p>
                <p><strong>Net Amount:</strong> ₹${data.financial.netAmount}</p>
                ${data.financial.perCapitaIncome ? `<p><strong>Per Capita Income:</strong> ₹${data.financial.perCapitaIncome}</p>` : ''}
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Family Members</h2>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Relationship</th>
                    <th>Education</th>
                    <th>Occupation</th>
                    <th>Monthly Income</th>
                    <th>Health Status</th>
                    <th>Sponsorship</th>
                </tr>
            </thead>
            <tbody>
                ${data.family.members.map((member: any) => `
                    <tr>
                        <td>${member.name}</td>
                        <td>${member.age}</td>
                        <td>${member.relationship}</td>
                        <td>${member.education}</td>
                        <td>${member.occupation || 'N/A'}</td>
                        <td>₹${member.monthlyIncome}</td>
                        <td>${member.healthStatus}</td>
                        <td>
                            ${member.sponsorshipAvailable ? 
                                `✓ Available (${member.sponsorshipCategory})<br>ID: ${member.memberHumanId}` : 
                                '✗ Not Available'
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Housing Details</h2>
        <div class="card">
            <p><strong>House Type:</strong> ${data.housing.type}</p>
            <p><strong>Condition:</strong> ${data.housing.condition}</p>
            <p><strong>Water Connection:</strong> ${data.housing.waterConnection ? 'Yes' : 'No'}</p>
            <p><strong>Electricity Connection:</strong> ${data.housing.electricityConnection ? 'Yes' : 'No'}</p>
            <p><strong>Gas Connection:</strong> ${data.housing.gasConnection ? 'Yes' : 'No'}</p>
            <p><strong>Toilet Facility:</strong> ${data.housing.toiletFacility}</p>
        </div>
    </div>

    ${data.assessment ? `
    <div class="section">
        <h2>Assessment Scores</h2>
        <div class="grid">
            <div class="card">
                <h3>Individual Scores</h3>
                <p><strong>Financial Score:</strong> <span class="score">${data.assessment.financialScore}/5</span></p>
                <p><strong>Dependents Score:</strong> <span class="score">${data.assessment.dependentsScore}/5</span></p>
                <p><strong>Social Status Score:</strong> <span class="score">${data.assessment.socialStatusScore}/5</span></p>
                <p><strong>Officer Score:</strong> <span class="score">${data.assessment.officerScore}/5</span></p>
            </div>
            <div class="card">
                <h3>Overall Assessment</h3>
                <p><strong>Total Score:</strong> <span class="score">${data.assessment.totalScore}/20</span></p>
                <p><strong>Category:</strong> ${data.assessment.category ? data.assessment.category.replace('_', ' ').toUpperCase() : 'Not Assigned'}</p>
                <p><strong>Category Color:</strong> ${data.assessment.categoryColor ? data.assessment.categoryColor.toUpperCase() : 'Not Assigned'}</p>
                ${data.survey.category ? `<p><strong>Admin Assigned Category:</strong> ${data.survey.category.replace('_', ' ').toUpperCase()}</p>` : ''}
            </div>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>Officer Report</h2>
        <div class="card">
            <p><strong>Survey Officer:</strong> ${data.officer.name} (${data.officer.email})</p>
            <p><strong>Officer Score:</strong> ${data.officer.score}/5</p>
            <p><strong>Verification Status:</strong> ${data.officer.verificationStatus}</p>
            <p><strong>Recommendation:</strong></p>
            <p style="font-style: italic; margin-left: 20px;">"${data.officer.recommendation}"</p>
        </div>
    </div>

    ${data.sponsorshipSummary.totalAvailable > 0 ? `
    <div class="section">
        <h2>Sponsorship Summary</h2>
        <div class="grid">
            <div class="card">
                <h3>Available for Sponsorship</h3>
                <p><strong>Total Members:</strong> ${data.sponsorshipSummary.totalAvailable}</p>
                <p><strong>Total Monthly Requirement:</strong> ₹${data.sponsorshipSummary.totalMonthlyRequirement}</p>
            </div>
            <div class="card">
                <h3>Categories</h3>
                ${Object.entries(data.sponsorshipSummary.categories).map(([category, count]) => 
                    `<p><strong>${category.replace('_', ' ')}:</strong> ${count}</p>`
                ).join('')}
            </div>
        </div>
    </div>
    ` : ''}

    ${data.reliefCard ? `
    <div class="section">
        <h2>Relief Card Information</h2>
        <div class="card">
            <p><strong>Card ID:</strong> ${data.reliefCard.cardId}</p>
            <p><strong>Assigned Date:</strong> ${new Date(data.reliefCard.assignedAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${data.reliefCard.status.toUpperCase()}</p>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>Report Summary</h2>
        <div class="card">
            <p><strong>Survey Status:</strong> ${data.survey.status.toUpperCase()}</p>
            ${data.survey.approvedAt ? `<p><strong>Approved Date:</strong> ${new Date(data.survey.approvedAt).toLocaleDateString()}</p>` : ''}
            ${data.survey.approvedBy ? `<p><strong>Approved By:</strong> ${data.survey.approvedBy}</p>` : ''}
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
  `;
}