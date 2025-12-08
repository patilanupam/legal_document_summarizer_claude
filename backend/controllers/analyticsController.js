const Document = require('../models/Document');
const User = require('../models/User');

/**
 * @desc    Get dashboard analytics
 * @route   GET /api/analytics/dashboard
 * @access  Private (Admin only)
 */
const getDashboardAnalytics = async (req, res) => {
  try {
    // Documents by category using aggregation
    const documentsByCategory = await Document.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Convert array to object for easier consumption
    const categoryStats = {};
    documentsByCategory.forEach(item => {
      categoryStats[item._id] = item.count;
    });

    // Documents by status using aggregation
    const documentsByStatus = await Document.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Convert array to object
    const statusStats = {};
    documentsByStatus.forEach(item => {
      statusStats[item._id] = item.count;
    });

    // Total documents count
    const totalDocuments = await Document.countDocuments();

    // Total storage used (sum of all file sizes)
    const storageStats = await Document.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);

    const totalStorageUsed = storageStats.length > 0 ? storageStats[0].totalSize : 0;

    // Active users (users who have uploaded documents)
    const activeUsersCount = await Document.distinct('uploadedBy').then(users => users.length);

    // Top active users by document count
    const topActiveUsers = await Document.aggregate([
      {
        $group: {
          _id: '$uploadedBy',
          documentCount: { $sum: 1 }
        }
      },
      {
        $sort: { documentCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          documentCount: 1,
          userName: '$user.name',
          userEmail: '$user.email'
        }
      }
    ]);

    // Recent uploads (documents created in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUploadsCount = await Document.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Documents by upload date (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const uploadTrend = await Document.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      documentsByCategory: categoryStats,
      documentsByStatus: statusStats,
      totalDocuments,
      totalStorageUsed,
      activeUsers: activeUsersCount,
      topActiveUsers,
      recentUploadsCount,
      uploadTrend
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardAnalytics
};
