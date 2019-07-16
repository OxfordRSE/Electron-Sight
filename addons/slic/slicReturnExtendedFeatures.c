//=================================================================================
//  slic.mex.c
//
//
//  AUTORIGHTS
//  Copyright (C) 2015 Ecole Polytechnique Federale de Lausanne (EPFL), Switzerland.
//
//  Created by Radhakrishna Achanta on 12/01/15.
//=================================================================================
/*Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met

 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * Neither the name of EPFL nor the
 names of its contributors may be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND ANY
 EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE REGENTS AND CONTRIBUTORS BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#include <assert.h>
#include <float.h>
#include <math.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

void rgbtolab(
    int* rin, int* gin, int* bin, int sz, double* lvec, double* avec, double* bvec)
{
  int sR, sG, sB;
  double R, G, B;
  double X, Y, Z;
  double r, g, b;
  const double epsilon = 0.008856; // actual CIE standard
  const double kappa = 903.3;      // actual CIE standard

  const double Xr = 0.950456; // reference white
  const double Yr = 1.0;      // reference white
  const double Zr = 1.088754; // reference white
  double xr, yr, zr;
  double fx, fy, fz;
  double lval, aval, bval;

  for (int i = 0; i < sz; i++) {
    sR = rin[i];
    sG = gin[i];
    sB = bin[i];

    R = sR / 255.0;
    G = sG / 255.0;
    B = sB / 255.0;

    if (R <= 0.04045)
      r = R / 12.92;
    else
      r = pow((R + 0.055) / 1.055, 2.4);
    if (G <= 0.04045)
      g = G / 12.92;
    else
      g = pow((G + 0.055) / 1.055, 2.4);
    if (B <= 0.04045)
      b = B / 12.92;
    else
      b = pow((B + 0.055) / 1.055, 2.4);

    X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

    //------------------------
    // XYZ to LAB conversion
    //------------------------
    xr = X / Xr;
    yr = Y / Yr;
    zr = Z / Zr;

    if (xr > epsilon)
      fx = pow(xr, 1.0 / 3.0);
    else
      fx = (kappa * xr + 16.0) / 116.0;
    if (yr > epsilon)
      fy = pow(yr, 1.0 / 3.0);
    else
      fy = (kappa * yr + 16.0) / 116.0;
    if (zr > epsilon)
      fz = pow(zr, 1.0 / 3.0);
    else
      fz = (kappa * zr + 16.0) / 116.0;

    lval = 116.0 * fy - 16.0;
    aval = 500.0 * (fx - fy);
    bval = 200.0 * (fy - fz);

    lvec[i] = lval;
    avec[i] = aval;
    bvec[i] = bval;
  }
}

void getLABXYSeeds(int STEP, int width, int height, int* seedIndices, int* numseeds)
{
  const bool hexgrid = false;
  int n;
  int xstrips, ystrips;
  int xerr, yerr;
  double xerrperstrip, yerrperstrip;
  int xoff, yoff;
  int x, y;
  int xe, ye;
  int seedx, seedy;
  int i;

  xstrips = (0.5 + (double)(width) / (double)(STEP));
  ystrips = (0.5 + (double)(height) / (double)(STEP));

  xerr = width - STEP * xstrips;
  if (xerr < 0) {
    xstrips--;
    xerr = width - STEP * xstrips;
  }
  yerr = height - STEP * ystrips;
  if (yerr < 0) {
    ystrips--;
    yerr = height - STEP * ystrips;
  }

  xerrperstrip = (double)(xerr) / (double)(xstrips);
  yerrperstrip = (double)(yerr) / (double)(ystrips);

  xoff = STEP / 2;
  yoff = STEP / 2;

  n = 0;
  for (y = 0; y < ystrips; y++) {
    ye = y * yerrperstrip;
    for (x = 0; x < xstrips; x++) {
      xe = x * xerrperstrip;
      seedx = (x * STEP + xoff + xe);
      if (hexgrid) {
        seedx = x * STEP + (xoff << (y & 0x1)) + xe;
        if (seedx >= width)
          seedx = width - 1;
      } // for hex grid sampling
      seedy = (y * STEP + yoff + ye);
      i = seedy * width + seedx;
      seedIndices[n] = i;
      n++;
    }
  }
  *numseeds = n;
}

void PerformSuperpixelSLIC(double* lvec, double* avec, double* bvec, double* kseedsl,
    double* kseedsa, double* kseedsb, double* kseedsx, double* kseedsy, int width,
    int height, int numseeds, int* klabels, int STEP, double compactness)
{
  int x1, y1, x2, y2;
  double l, a, b;
  double dist;
  double distxy;
  int itr;
  int n;
  int x, y;
  int i;
  int ind;
  int r, c;
  int k;
  int sz = width * height;
  const int numk = numseeds;
  int offset = STEP;

  double* clustersize = malloc(sizeof(double) * numk);
  double* inv = malloc(sizeof(double) * numk);
  double* sigmal = malloc(sizeof(double) * numk);
  double* sigmaa = malloc(sizeof(double) * numk);
  double* sigmab = malloc(sizeof(double) * numk);
  double* sigmax = malloc(sizeof(double) * numk);
  double* sigmay = malloc(sizeof(double) * numk);
  double* distvec = malloc(sizeof(double) * sz);
  double invwt = 1.0 / ((STEP / compactness) * (STEP / compactness));

  for (itr = 0; itr < 10; itr++) {
    for (i = 0; i < sz; i++) {
      distvec[i] = DBL_MAX;
    }

    for (n = 0; n < numk; n++) {
      x1 = kseedsx[n] - offset;
      if (x1 < 0)
        x1 = 0;
      y1 = kseedsy[n] - offset;
      if (y1 < 0)
        y1 = 0;
      x2 = kseedsx[n] + offset;
      if (x2 > width)
        x2 = width;
      y2 = kseedsy[n] + offset;
      if (y2 > height)
        y2 = height;

      for (y = y1; y < y2; y++) {
        for (x = x1; x < x2; x++) {
          i = y * width + x;

          l = lvec[i];
          a = avec[i];
          b = bvec[i];

          dist = (l - kseedsl[n]) * (l - kseedsl[n])
              + (a - kseedsa[n]) * (a - kseedsa[n])
              + (b - kseedsb[n]) * (b - kseedsb[n]);

          distxy = (x - kseedsx[n]) * (x - kseedsx[n])
              + (y - kseedsy[n]) * (y - kseedsy[n]);

          dist += distxy * invwt;

          if (dist < distvec[i]) {
            distvec[i] = dist;
            klabels[i] = n;
          }
        }
      }
    }
    //-----------------------------------------------------------------
    // Recalculate the centroid and store in the seed values
    //-----------------------------------------------------------------
    for (k = 0; k < numk; k++) {
      sigmal[k] = 0;
      sigmaa[k] = 0;
      sigmab[k] = 0;
      sigmax[k] = 0;
      sigmay[k] = 0;
      clustersize[k] = 0;
    }

    ind = 0;
    for (r = 0; r < height; r++) {
      for (c = 0; c < width; c++) {
        if (klabels[ind] > 0) {
          sigmal[klabels[ind]] += lvec[ind];
          sigmaa[klabels[ind]] += avec[ind];
          sigmab[klabels[ind]] += bvec[ind];
          sigmax[klabels[ind]] += c;
          sigmay[klabels[ind]] += r;
          clustersize[klabels[ind]] += 1.0;
        }
        ind++;
      }
    }

    {
      for (k = 0; k < numk; k++) {
        if (clustersize[k] <= 0)
          clustersize[k] = 1;
        inv[k] = 1.0
            / clustersize[k]; // computing inverse now to multiply, than divide later
      }
    }

    {
      for (k = 0; k < numk; k++) {
        kseedsl[k] = sigmal[k] * inv[k];
        kseedsa[k] = sigmaa[k] * inv[k];
        kseedsb[k] = sigmab[k] * inv[k];
        kseedsx[k] = sigmax[k] * inv[k];
        kseedsy[k] = sigmay[k] * inv[k];
      }
    }
  }
  free(sigmal);
  free(sigmaa);
  free(sigmab);
  free(sigmax);
  free(sigmay);
  free(clustersize);
  free(inv);
  free(distvec);
}

void EnforceConnectivity(int* labels, int width, int height, int numSuperpixels,
    int* nlabels, int* finalNumberOfLabels)
{
  int i, j, k;
  int n, c, count;
  int x, y;
  int ind;
  int label;
  const int dx4[4] = { -1, 0, 1, 0 };
  const int dy4[4] = { 0, -1, 0, 1 };
  const int sz = width * height;
  int* xvec = malloc(sizeof(int) * sz);
  int* yvec = malloc(sizeof(int) * sz);
  const int SUPSZ = sz / numSuperpixels;
  for (i = 0; i < sz; i++)
    nlabels[i] = -1;
  int oindex = 0;
  int adjlabel = 0; // adjacent label
  label = 0;
  for (j = 0; j < height; j++) {
    for (k = 0; k < width; k++) {
      if (0 > nlabels[oindex]) {
        nlabels[oindex] = label;

        //--------------------
        // Start a new segment
        //--------------------
        xvec[0] = k;
        yvec[0] = j;
        //-------------------------------------------------------
        // Quickly find an adjacent label for use later if needed
        //-------------------------------------------------------
        {
          for (n = 0; n < 4; n++) {
            int x = xvec[0] + dx4[n];
            int y = yvec[0] + dy4[n];
            if ((x >= 0 && x < width) && (y >= 0 && y < height)) {
              int nindex = y * width + x;
              if (nlabels[nindex] >= 0)
                adjlabel = nlabels[nindex];
            }
          }
        }

        count = 1;
        for (c = 0; c < count; c++) {
          for (n = 0; n < 4; n++) {
            x = xvec[c] + dx4[n];
            y = yvec[c] + dy4[n];

            if ((x >= 0 && x < width) && (y >= 0 && y < height)) {
              int nindex = y * width + x;

              if (0 > nlabels[nindex] && labels[oindex] == labels[nindex]) {
                xvec[count] = x;
                yvec[count] = y;
                nlabels[nindex] = label;
                count++;
              }
            }
          }
        }
        //-------------------------------------------------------
        // If segment size is less then a limit, assign an
        // adjacent label found before, and decrement label count.
        //-------------------------------------------------------
        if (count <= SUPSZ >> 2) {
          for (c = 0; c < count; c++) {
            ind = yvec[c] * width + xvec[c];
            nlabels[ind] = adjlabel;
          }
          label--;
        }
        label++;
      }

      oindex++;
    }
  }
  *finalNumberOfLabels = label;

  free(xvec);
  free(yvec);
}

void slicReturnExtendedFeatures(unsigned char* imgbytes, int width, int height,
    int nchannels, int numSuperpixels, int compactness, int** outlabels,
    int* outputNumSuperpixels, double** outLABMeanintensities, int** outPixelCounts,
    int** outseedsXY, double** outLABVariances, double** outCollectedFeatures)
{

  printf("performing slicReturnExtendedFeatures on (%d, %d) image with %d channels, "
         "trying to obtain %d superpixels with %d compactness\n",
      width, height, nchannels, numSuperpixels, compactness);

  //---------------------------
  // Variable declarations
  //---------------------------
  int sz;
  int i, ii;
  int x, y, n;
  int* rin;
  int* gin;
  int* bin;
  int* klabels;
  int* clabels;
  double* lvec;
  double* avec;
  double* bvec;
  int step;
  int* seedIndices;
  int numseeds;
  double* kseedsx;
  double* kseedsy;
  double* kseedsl;
  double* kseedsa;
  double* kseedsb;
  double* LABMeanintensities;
  int* PixelCounts;
  double* SumXVector;
  double* SumSqrXVector;
  double* KVector;
  int k, kk, kkk;
  int* superpixelMinX;
  int* superpixelMaxX;
  int* superpixelMinY;
  int* superpixelMaxY;
  int* superpixelPerimeter;
  int* neighbouringLabelsStore;
  int* neighbouringLabelsStoreCounter;
  int* twoStepneighbouringLabelsStore;
  int* twoStepneighbouringLabelsStoreCounter;
  double* collectedFeatures;
  int finalNumberOfLabels;

  int* _outlabels;
  double* _outLABMeanintensities;
  int* _outPixelCounts;
  int* _outseedsXY;
  double* _outLABVariances;
  double* _outCollectedFeatures;

  //---------------------------
  sz = width * height;
  //---------------------------

  //---------------------------
  // Allocate memory
  //---------------------------
  rin = malloc(sizeof(int) * sz);
  gin = malloc(sizeof(int) * sz);
  bin = malloc(sizeof(int) * sz);
  // lvec    = malloc( sizeof(double)      * sz ) ;
  // avec    = malloc( sizeof(double)      * sz ) ;
  // bvec    = malloc( sizeof(double)      * sz ) ;
  lvec = calloc(sz, sizeof(double));
  avec = calloc(sz, sizeof(double));
  bvec = calloc(sz, sizeof(double));
  klabels = malloc(sizeof(int) * sz); // original k-means labels
  clabels = malloc(sizeof(int) * sz); // corrected labels after enforcing connectivity
  seedIndices = malloc(sizeof(int) * sz);
  LABMeanintensities = calloc(sz * 3, sizeof(double));
  PixelCounts = calloc(sz, sizeof(int));
  SumXVector = calloc(
      sz * 3, sizeof(double)); // Used to store sum[ x_i - K ]for calculating variance
  SumSqrXVector
      = calloc(sz * 3, sizeof(double)); // Used to store sum of squares sum[ (x_i -
                                        // K)^2 ] for calculating variance
  KVector = malloc(sizeof(double) * sz
      * 3); // Used to store constant K for calculating variance with shift in location
            // to avoid catastrophic cancellation

  superpixelMinX = calloc(sz, sizeof(int));
  superpixelMinY = calloc(sz, sizeof(int));
  superpixelMaxX = calloc(sz, sizeof(int));
  superpixelMaxY = calloc(sz, sizeof(int));

  superpixelPerimeter = calloc(sz, sizeof(int));

  //---------------------------
  // Perform color conversion
  //---------------------------
  // if it is a grayscale image, copy the values directly into the lab vectors
  if (nchannels == 1) {
    // reading data from row-major RGBA matrics to row-major C matrices
    for (y = 0, ii = 0; y < height; y++) {
      for (x = 0; x < width; x++) {
        i = y * width + x;
        lvec[i] = imgbytes[ii];
        avec[i] = imgbytes[ii];
        bvec[i] = imgbytes[ii];
        ii++;
      }
    }
  } else // else covert from rgba to lab
  {
    // reading data from row-major RGBA matrics to row-major C matrices
    for (y = 0, ii = 0; y < height; y++) {
      for (x = 0; x < width; x++) {
        i = y * width + x;
        rin[i] = imgbytes[ii];
        gin[i] = imgbytes[ii + 1];
        bin[i] = imgbytes[ii + 2];
        ii += nchannels;
        PixelCounts[i] = 0;
      }
    }
    rgbtolab(rin, gin, bin, sz, lvec, avec, bvec);
  }

  for (y = 0; y < height; y++) {
    for (x = 0; x < width; x++) {
      i = y * width + x;
      if (PixelCounts[i] != 0) {
        printf("Panic!");
      }
    }
  }

  //---------------------------
  // Find seeds
  //---------------------------
  step = sqrt((double)(sz) / (double)(numSuperpixels)) + 0.5;
  getLABXYSeeds(step, width, height, seedIndices, &numseeds);

  kseedsx = malloc(sizeof(double) * numseeds);
  kseedsy = malloc(sizeof(double) * numseeds);
  kseedsl = malloc(sizeof(double) * numseeds);
  kseedsa = malloc(sizeof(double) * numseeds);
  kseedsb = malloc(sizeof(double) * numseeds);
  for (k = 0; k < numseeds; k++) {
    kseedsx[k] = seedIndices[k] % width;
    kseedsy[k] = seedIndices[k] / width;
    kseedsl[k] = lvec[seedIndices[k]];
    kseedsa[k] = avec[seedIndices[k]];
    kseedsb[k] = bvec[seedIndices[k]];
  }

  //---------------------------
  // Compute superpixels
  //---------------------------
  PerformSuperpixelSLIC(lvec, avec, bvec, kseedsl, kseedsa, kseedsb, kseedsx, kseedsy,
      width, height, numseeds, klabels, step, compactness);
  //---------------------------
  // Enforce connectivity
  //---------------------------
  EnforceConnectivity(
      klabels, width, height, numSuperpixels, clabels, &finalNumberOfLabels);
  printf("found %d final labels after connectivity\n", finalNumberOfLabels);
  //---------------------------
  // Assign output labels
  //---------------------------
  // plhs[0] = mxCreateNumericMatrix(height,width,mxINT32_CLASS,mxREAL);
  // outlabels = mxGetData(plhs[0]);
  *outlabels = (int*)malloc(height * width * sizeof(int));
  _outlabels = *outlabels;

  // preparation for storing superpixel neighbours array, up to 30 per superpixel, and
  // two step neighbours, up to 80 per superpixel
  int neighbouringLabelsStoreWidth = 40;
  neighbouringLabelsStore
      = calloc(finalNumberOfLabels * neighbouringLabelsStoreWidth, sizeof(int));
  neighbouringLabelsStoreCounter = calloc(finalNumberOfLabels, sizeof(int));
  int twoStepneighbouringLabelsStoreWidth = 90;
  twoStepneighbouringLabelsStore
      = calloc(finalNumberOfLabels * twoStepneighbouringLabelsStoreWidth, sizeof(int));
  twoStepneighbouringLabelsStoreCounter = calloc(finalNumberOfLabels, sizeof(int));

  const int dx4[4] = { -1, 0, 1, 0 };
  const int dy4[4] = { 0, -1, 0, 1 };
  for (y = 0, ii = 0; y < height; y++) {
    for (x = 0; x < width; x++) {
      i = y * width + x;
      _outlabels[ii] = clabels[i];

      //------------------------------------------------------------
      // As this is the last time we loop over all pixels, once the
      // final out label has been assigned we bin the intensities
      // and use this to calculate the superpixel colour.
      //------------------------------------------------------------
      // j,k run over width and height
      // index = width*k + j

      LABMeanintensities[3 * _outlabels[ii]] += lvec[i];
      LABMeanintensities[3 * _outlabels[ii] + 1] += avec[i];
      LABMeanintensities[3 * _outlabels[ii] + 2] += bvec[i];

      // Calculate variances for LAB
      // If entry is the first for pixel, set K to be the value for first entry
      if (PixelCounts[clabels[i]] + 1 == 1) {
        KVector[3 * _outlabels[ii]] = lvec[i];
        KVector[3 * _outlabels[ii] + 1] = avec[i];
        KVector[3 * _outlabels[ii] + 2] = bvec[i];

        // Also set initial min and max X and Y for superpixel
        superpixelMinX[clabels[i]] = x;
        superpixelMinY[clabels[i]] = y;
        superpixelMaxX[clabels[i]] = x;
        superpixelMaxY[clabels[i]] = y;

        superpixelPerimeter[clabels[i]] = 0;
      }

      SumXVector[3 * _outlabels[ii]]
          += (lvec[i] - KVector[3 * _outlabels[ii]]); // Used to store sum[ x_i - K ]for
                                                      // calculating variance
      SumXVector[3 * _outlabels[ii] + 1] += (avec[i] - KVector[3 * _outlabels[ii] + 1]);
      SumXVector[3 * _outlabels[ii] + 2] += (bvec[i] - KVector[3 * _outlabels[ii] + 2]);
      SumSqrXVector[3 * _outlabels[ii]] += ((lvec[i] - KVector[3 * _outlabels[ii]])
          * (lvec[i] - KVector[3 * _outlabels[ii]]));
      SumSqrXVector[3 * _outlabels[ii] + 1]
          += ((avec[i] - KVector[3 * _outlabels[ii] + 1])
              * (avec[i] - KVector[3 * _outlabels[ii] + 1]));
      SumSqrXVector[3 * _outlabels[ii] + 2]
          += ((bvec[i] - KVector[3 * _outlabels[ii] + 2])
              * (bvec[i] - KVector[3 * _outlabels[ii] + 2]));

      // While we're here, we also populate the neighbouring labels list
      int mylabel = clabels[i];
      int nlsStartIndex = mylabel * neighbouringLabelsStoreWidth;
      // Find labels of surrounding pixels
      for (n = 0; n < 4; n++) {
        // Check neighbouring pixel
        int x_neighbour = x + dx4[n];
        int y_neighbour = y + dy4[n];
        // if not off the edge
        if ((x_neighbour >= 0 && x_neighbour < width)
            && (y_neighbour >= 0 && y_neighbour < height)) {
          int neighbourindex = y_neighbour * width + x_neighbour;
          if (clabels[neighbourindex] != mylabel) {
            // We've found a neighbour. Check if this index is in the neighbouring
            // labels list
            bool neighbourLabelInList = false;
            int numNeighboursSoFar = neighbouringLabelsStoreCounter[mylabel];

            // for( int nlsRowIndex = 0; nlsRowIndex < numNeighboursSoFar;
            // nlsRowIndex++)
            for (int nlsRowIndex = 0; nlsRowIndex < neighbouringLabelsStoreWidth;
                 nlsRowIndex++) {
              if (clabels[neighbourindex]
                  == neighbouringLabelsStore[nlsStartIndex + nlsRowIndex]) {
                neighbourLabelInList = true;
                break;
              }
            }
            if (!neighbourLabelInList) {
              // We've found a neighbour we don't currently have for this superpixel!
              // Add it to the list and increment the neighbouring label counter Also,
              // check that we're not overflowing the list
              assert(numNeighboursSoFar < neighbouringLabelsStoreWidth);
              neighbouringLabelsStore[nlsStartIndex + numNeighboursSoFar]
                  = clabels[neighbourindex];

              neighbouringLabelsStoreCounter[mylabel]++;
            }
          }
        }
      }

      // Check superpixel ranges
      if (superpixelMinX[mylabel] > x) {
        superpixelMinX[mylabel] = x;
      }
      if (superpixelMinY[mylabel] > y) {
        superpixelMinY[mylabel] = y;
      }
      if (superpixelMaxX[mylabel] < x) {
        superpixelMaxX[mylabel] = x;
      }
      if (superpixelMaxY[mylabel] < y) {
        superpixelMaxY[mylabel] = y;
      }

      // Add to superpixel perimeter
      // Check neighbouring pixels: add (4 - neighbours in superpixel) to perimeter
      // count
      int exposedEdges = 4;
      int j;
      if (x > 0) {
        j = y * width + (x - 1);
        if (clabels[j] == clabels[i]) {
          exposedEdges -= 1;
        }
      }
      if (x < width) {
        j = y * width + (x + 1);
        if (clabels[j] == clabels[i]) {
          exposedEdges -= 1;
        }
      }
      if (y > 0) {
        j = (y - 1) * width + x;
        if (clabels[j] == clabels[i]) {
          exposedEdges -= 1;
        }
      }
      if (y < (height - 1)) {
        j = (y + 1) * width + x;
        if (clabels[j] == clabels[i]) {
          exposedEdges -= 1;
        }
      }

      superpixelPerimeter[clabels[i]] += exposedEdges;
      PixelCounts[clabels[i]] += 1;

      ii++;
    }
  }

  //---------------------------
  // Assign number of labels/seeds
  //---------------------------
  // plhs[1] = mxCreateNumericMatrix(1,1,mxINT32_CLASS,mxREAL);
  // outputNumSuperpixels = (int*)mxGetData(plhs[1]);//gives a void*, cast it to int*
  *outputNumSuperpixels = finalNumberOfLabels;

  //---------------------------
  // Match each superpixel with its average colour intensity for output
  //---------------------------
  // plhs[2] = mxCreateNumericMatrix(3,finalNumberOfLabels,mxDOUBLE_CLASS,mxREAL);
  // outLABMeanintensities = mxGetData(plhs[2]);
  *outLABMeanintensities = (double*)malloc(3 * finalNumberOfLabels * sizeof(double));
  _outLABMeanintensities = *outLABMeanintensities;

  // plhs[3] = mxCreateNumericMatrix(1,finalNumberOfLabels,mxINT32_CLASS,mxREAL);
  // outPixelCounts = mxGetData(plhs[3]);
  *outPixelCounts = (int*)malloc(finalNumberOfLabels * sizeof(int));
  _outPixelCounts = *outPixelCounts;

  // plhs[4] = mxCreateNumericMatrix(2,finalNumberOfLabels,mxINT32_CLASS,mxREAL);
  // outseedsXY = mxGetData(plhs[4]);
  *outseedsXY = (int*)malloc(2 * finalNumberOfLabels * sizeof(int));
  _outseedsXY = *outseedsXY;

  // plhs[5] = mxCreateNumericMatrix(3,finalNumberOfLabels,mxDOUBLE_CLASS,mxREAL);
  // outLABVariances = mxGetData(plhs[5]);
  *outLABVariances = (double*)malloc(3 * finalNumberOfLabels * sizeof(double));
  _outLABVariances = *outLABVariances;

  // plhs[6] = mxCreateNumericMatrix(26,finalNumberOfLabels,mxDOUBLE_CLASS,mxREAL);
  // outCollectedFeatures = mxGetData(plhs[6]);
  *outCollectedFeatures = (double*)malloc(26 * finalNumberOfLabels * sizeof(double));
  _outCollectedFeatures = *outCollectedFeatures;

  for (k = 0; k < finalNumberOfLabels; k++) {
    // _outseedsXY[k] = seedIndices[k];
    kk = k * 2;
    kkk = k * 3;
    _outseedsXY[kk] = kseedsx[k];
    _outseedsXY[kk + 1] = kseedsy[k];
    _outLABMeanintensities[kkk] = LABMeanintensities[kkk] / PixelCounts[k];
    _outLABMeanintensities[kkk + 1] = LABMeanintensities[kkk + 1] / PixelCounts[k];
    _outLABMeanintensities[kkk + 2] = LABMeanintensities[kkk + 2] / PixelCounts[k];
    _outPixelCounts[k] = PixelCounts[k];
    _outLABVariances[kkk]
        = (SumSqrXVector[kkk] - (SumXVector[kkk] * SumXVector[kkk] / PixelCounts[k]))
        / PixelCounts[k];
    _outLABVariances[kkk + 1]
        = (SumSqrXVector[kkk + 1]
              - (SumXVector[kkk + 1] * SumXVector[kkk + 1] / PixelCounts[k]))
        / PixelCounts[k];
    _outLABVariances[kkk + 2]
        = (SumSqrXVector[kkk + 2]
              - (SumXVector[kkk + 2] * SumXVector[kkk + 2] / PixelCounts[k]))
        / PixelCounts[k];

    //        outneighbouringLabelsStoreCounter[k] = neighbouringLabelsStoreCounter[k];
    int nlsStartIndex = k * neighbouringLabelsStoreWidth;
    int nlsTwoStepStartIndex = k * twoStepneighbouringLabelsStoreWidth;
    // Loop over label's neighbours
    for (int counter = 0; counter < neighbouringLabelsStoreCounter[k]; counter++) {
      // Add the neighbour to the output store
      int neighbourLabel = neighbouringLabelsStore[nlsStartIndex + counter];
      //            outneighbouringLabelsStore[nlsStartIndex + counter] =
      //            neighbourLabel;

      // Find the neighbouring labels of this label and loop over them!
      int neighboursNlsStartIndex = neighbourLabel * neighbouringLabelsStoreWidth;
      for (int counter2 = 0; counter2 < neighbouringLabelsStoreCounter[neighbourLabel];
           counter2++) {
        int candidateTwoStepLabel
            = neighbouringLabelsStore[neighboursNlsStartIndex + counter2];
        bool labelExists = false;
        // Loop over the current twoStep store for our label, and compare with the
        // candidate
        for (int counter3 = 0; counter3 < twoStepneighbouringLabelsStoreCounter[k];
             counter3++) {
          // Compare candidate with this element of list
          if (twoStepneighbouringLabelsStore[nlsTwoStepStartIndex + counter3]
              == candidateTwoStepLabel) {
            labelExists = true;
            break;
          }
        }
        // Now, if our candidate is NOT in the list, we add it on and increase the
        // counter
        if (!labelExists) {
          twoStepneighbouringLabelsStore[nlsTwoStepStartIndex
              + twoStepneighbouringLabelsStoreCounter[k]]
              = candidateTwoStepLabel;
          twoStepneighbouringLabelsStoreCounter[k]++;
        }
      }
    }
  }

  // OK, now that we've sorted out our one- and two- step neighbours, now we make our
  // feature vectors! 1-3 = our mean (Lab) 4-6 = our variance (Lab) 7-9 = one-step mean
  // 10-12 = one-step variance
  // 13-15 = two-step mean
  // 16-18 = two-step variance
  // 19-20 = superpixel width and height
  // 21 = superpixel aspect ratio (width/height)
  // 22 = number of pixels within superpixel
  collectedFeatures = calloc(26 * finalNumberOfLabels, sizeof(double));
  for (k = 0; k < finalNumberOfLabels; k++) {
    int featuresStartIndex = 26 * k;
    int meansAndVariancesStartIndex = 3 * k;
    collectedFeatures[featuresStartIndex]
        = _outLABMeanintensities[meansAndVariancesStartIndex];
    collectedFeatures[featuresStartIndex + 1]
        = _outLABMeanintensities[meansAndVariancesStartIndex + 1];
    collectedFeatures[featuresStartIndex + 2]
        = _outLABMeanintensities[meansAndVariancesStartIndex + 2];
    // Variances
    collectedFeatures[featuresStartIndex + 3]
        = _outLABVariances[meansAndVariancesStartIndex];
    collectedFeatures[featuresStartIndex + 4]
        = _outLABVariances[meansAndVariancesStartIndex + 1];
    collectedFeatures[featuresStartIndex + 5]
        = _outLABVariances[meansAndVariancesStartIndex + 2];

    int nlsStartIndex = k * neighbouringLabelsStoreWidth;
    for (int colourChannel = 0; colourChannel < 3; colourChannel++) {
      // Loop over one step neighbours and add their mean and variances
      // Loop over label's neighbours
      double neighbourMeansSum = 0;
      double neighbourVariancesSum = 0;
      for (int counter = 0; counter < neighbouringLabelsStoreCounter[k]; counter++) {
        // Add the neighbour to the output store
        int neighbourLabel = neighbouringLabelsStore[nlsStartIndex + counter];
        int neighbourMeansAndVariancesStartIndex = 3 * neighbourLabel;
        neighbourMeansSum += _outLABMeanintensities[neighbourMeansAndVariancesStartIndex
            + colourChannel];
        neighbourVariancesSum
            += _outLABVariances[neighbourMeansAndVariancesStartIndex + colourChannel];
      }
      double neighbourMeansAverage
          = neighbourMeansSum / neighbouringLabelsStoreCounter[k];
      double neighbourVariancesAverage
          = neighbourVariancesSum / neighbouringLabelsStoreCounter[k];
      collectedFeatures[featuresStartIndex + 6 + colourChannel] = neighbourMeansAverage;
      collectedFeatures[featuresStartIndex + 9 + colourChannel]
          = neighbourVariancesAverage;
    }

    // Repeat for two-step neighbours
    int nlsStartIndex_twoStep = k * twoStepneighbouringLabelsStoreWidth;
    for (int colourChannel = 0; colourChannel < 3; colourChannel++) {
      // Loop over one step neighbours and add their mean and variances
      // Loop over label's neighbours
      double neighbourMeansSum = 0;
      double neighbourVariancesSum = 0;
      for (int counter = 0; counter < twoStepneighbouringLabelsStoreCounter[k];
           counter++) {
        // Add the neighbour to the output store
        int neighbourLabel
            = twoStepneighbouringLabelsStore[nlsStartIndex_twoStep + counter];
        int neighbourMeansAndVariancesStartIndex = 3 * neighbourLabel;
        neighbourMeansSum += _outLABMeanintensities[neighbourMeansAndVariancesStartIndex
            + colourChannel];
        neighbourVariancesSum
            += _outLABVariances[neighbourMeansAndVariancesStartIndex + colourChannel];
      }
      double neighbourMeansAverage
          = neighbourMeansSum / twoStepneighbouringLabelsStoreCounter[k];
      double neighbourVariancesAverage
          = neighbourVariancesSum / twoStepneighbouringLabelsStoreCounter[k];
      collectedFeatures[featuresStartIndex + 12 + colourChannel]
          = neighbourMeansAverage;
      collectedFeatures[featuresStartIndex + 15 + colourChannel]
          = neighbourVariancesAverage;
    }

    // Now for the superpixel size metrics
    // 19-20 = superpixel width and height
    // 21 = superpixel aspect ratio (width/height)
    // 22 = number of pixels within superpixel
    // 23 = superpixelPerimeter
    // 24 = perimeter / area ratio
    collectedFeatures[featuresStartIndex + 18] = superpixelMaxX[k] - superpixelMinX[k];
    collectedFeatures[featuresStartIndex + 19] = superpixelMaxY[k] - superpixelMinY[k];
    collectedFeatures[featuresStartIndex + 20] = 1.0
        * (superpixelMaxX[k] - superpixelMinX[k])
        / (superpixelMaxY[k] - superpixelMinY[k]);
    collectedFeatures[featuresStartIndex + 21] = PixelCounts[k];
    collectedFeatures[featuresStartIndex + 22] = superpixelPerimeter[k];
    collectedFeatures[featuresStartIndex + 23]
        = 1.0 * superpixelPerimeter[k] / PixelCounts[k];

    // 25-26 = number of neighbours / two-step neighbours
    collectedFeatures[featuresStartIndex + 24] = neighbouringLabelsStoreCounter[k];
    collectedFeatures[featuresStartIndex + 25]
        = twoStepneighbouringLabelsStoreCounter[k];

    // Now that we've sorted the collected features for this label, we update the output
    // list
    for (int featureCounter = 0; featureCounter < 26; featureCounter++) {
      _outCollectedFeatures[featuresStartIndex + featureCounter]
          = collectedFeatures[featuresStartIndex + featureCounter];
    }
  }

  //---------------------------
  // Deallocate memory
  //---------------------------
  free(rin);
  free(gin);
  free(bin);
  free(lvec);
  free(avec);
  free(bvec);
  free(klabels);
  free(clabels);
  free(seedIndices);
  free(PixelCounts);
  free(LABMeanintensities);
  free(kseedsx);
  free(kseedsy);
  free(kseedsl);
  free(kseedsa);
  free(kseedsb);
  free(SumXVector);
  free(SumSqrXVector);
  free(KVector);
  free(neighbouringLabelsStore);
  free(neighbouringLabelsStoreCounter);
  free(twoStepneighbouringLabelsStore);
  free(twoStepneighbouringLabelsStoreCounter);
  free(collectedFeatures);
  free(superpixelMinX);
  free(superpixelMinY);
  free(superpixelMaxX);
  free(superpixelMaxY);
  free(superpixelPerimeter);
}

// PixelCounts
