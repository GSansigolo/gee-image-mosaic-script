// 1. Define the Region of Interest (ROI) using the provided BBox
var name = "MT"
var min_lon = -56.4532;
var min_lat = -13.3869;
var max_lon = -55.4974;
var max_lat = -12.4849;
var roi = ee.Geometry.BBox(min_lon, min_lat, max_lon, max_lat);

// 2. Define the temporal parameters
var start_year = 2026;
var start_month = 1;
var start_day = 1;
var duration_days = 16; 
var mosaic_method = "lcf"; // "lcf" (least cloud-cocover first) or "chrono" (chronological)

var start_date = ee.Date.fromYMD(start_year, start_month, start_day);
var end_date = start_date.advance(duration_days, 'day');

// 3. Define the Cloud Masking Function using the SCL band
function mask_s2_clouds(image) {
  var scl = image.select('SCL');
  var mask = scl.eq(4).or(scl.eq(5)).or(scl.eq(6));
  
  return image.updateMask(mask)
              .select(['B2', 'B3', 'B4'])
              .copyProperties(image, ['system:time_start', 'CLOUDY_PIXEL_PERCENTAGE']);
}

// 4. Fetch the Base Sentinel-2 Collection for the given date and bounds
var collection = 'COPERNICUS/S2_SR_HARMONIZED';
var base_collection = ee.ImageCollection(collection)
  .filterBounds(roi)
  .filterDate(start_date, end_date);

// 5. Create the Background List (Unmasked)
var unmasked_background_list = base_collection
  .select(['B2', 'B3', 'B4'])
  .sort('CLOUDY_PIXEL_PERCENTAGE', false);

// 6. Create the Foreground List (Cloud-Clipped)
var masked_foreground_list = base_collection.map(mask_s2_clouds);

// Sorting based on mosaic_method
if (mosaic_method === 'lcf') {
  masked_foreground_list = masked_foreground_list.sort('CLOUDY_PIXEL_PERCENTAGE', false);
} else if (mosaic_method === 'chrono') {
  masked_foreground_list = masked_foreground_list.sort('system:time_start');
}

// 7. Merge the list
var combined_collection = unmasked_background_list.merge(masked_foreground_list);

// 8. Create the final mosaic and clip it to the ROI
var final_mosaic = combined_collection.mosaic().clip(roi);

// 9. Visualization in the Code Editor
var vis_params = {
  bands: ['B4', 'B3', 'B2'], 
  min: 0,
  max: 2000,
  gamma: 1.4
};

Map.centerObject(roi, 10);
Map.addLayer(roi, {color: 'red'}, 'ROI Boundary', false);
Map.addLayer(final_mosaic, vis_params, 'Final Mosaic (No Holes)');

// 10. Export the hole-free Images as THREE separate GeoTIFFs to Google Drive

// Export Band 2
Export.image.toDrive({
  image: final_mosaic.select('B2'),
  description: 'S2-' + name + '-B2',
  folder: 'EarthEngine_Exports',
  scale: 10, 
  region: roi,
  crs: 'EPSG:4326', 
  maxPixels: 1e13
});

// Export Band 3
Export.image.toDrive({
  image: final_mosaic.select('B3'),
  description: 'S2-' + name + '-B3',
  folder: 'EarthEngine_Exports',
  scale: 10, 
  region: roi,
  crs: 'EPSG:4326', 
  maxPixels: 1e13
});

// Export Band 4
Export.image.toDrive({
  image: final_mosaic.select('B4'),
  description: 'S2-' + name + '-B4',
  folder: 'EarthEngine_Exports',
  scale: 10, 
  region: roi,
  crs: 'EPSG:4326', 
  maxPixels: 1e13
});